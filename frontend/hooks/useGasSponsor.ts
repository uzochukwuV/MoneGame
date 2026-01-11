import { useCurrentAccount, useSuiClient, useSignTransaction, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { useCallback } from 'react';

/**
 * Gas Sponsorship Hook (Dual-Signature Pattern)
 *
 * This hook implements the official Mysten Labs sponsored transaction pattern:
 * 1. Build transaction KIND only (no gas config)
 * 2. Backend deserializes with Transaction.fromKind()
 * 3. Backend sets gas owner, gas payment, builds and SIGNS
 * 4. Frontend signs the same transaction
 * 5. Execute with BOTH signatures (user + sponsor)
 *
 * Usage:
 * const { executeWithSponsor, isSponsored } = useGasSponsor();
 * const tx = new Transaction();
 * // ... build transaction
 * const result = await executeWithSponsor(tx);
 */

interface SponsoredTransactionResult {
  digest: string;
  effects: any;
  sponsored: boolean;
}

interface SponsorResponse {
  success: boolean;
  sponsoredTransaction?: {
    bytes: string;
    signature: string;
    sponsor: string;
  };
  error?: string;
  details?: string;
}

export function useGasSponsor() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Check if gas sponsorship is enabled
  const isSponsorshipEnabled = useCallback((): boolean => {
    return process.env.NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED === 'true';
  }, []);

  // Execute transaction with gas sponsorship (Dual-Signature Pattern)
  const executeWithSponsor = useCallback(async (
    tx: Transaction
  ): Promise<SponsoredTransactionResult> => {
    if (!currentAccount?.address) {
      throw new Error('No wallet connected');
    }

    // If sponsorship is not enabled, execute normally
    if (!isSponsorshipEnabled()) {
      console.log('Gas sponsorship disabled - executing with user gas');
      return await executeWithUserGas(tx);
    }

    try {
      // STEP 1: Build transaction KIND only (no gas configuration)
      // This is the core transaction logic without gas payment details
      const transactionKindBytes = await tx.build({
        client,
        onlyTransactionKind: true,
      });

      console.log('Sending transaction to sponsor...');

      // STEP 2: Send transaction KIND to sponsor endpoint
      const response = await fetch('/api/sponsor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionKindBytes: Array.from(transactionKindBytes),
          sender: currentAccount.address,
        }),
      });

      const data: SponsorResponse = await response.json();

      if (!response.ok || !data.success || !data.sponsoredTransaction) {
        console.error('Gas sponsorship failed:', data.error);
        console.log('Falling back to user-paid gas');
        return await executeWithUserGas(tx);
      }

      console.log('Sponsor configured transaction:', data.sponsoredTransaction.sponsor);

      // STEP 3: Deserialize the sponsored transaction that has gas configured
      // The backend has already set gas owner, gas payment, and gas budget
      const sponsoredTxBytes = fromBase64(data.sponsoredTransaction.bytes);
      const sponsoredTx = Transaction.from(sponsoredTxBytes);

      // STEP 4: User signs the sponsored transaction
      console.log('Requesting user signature...');
      const userSignature = await signTransaction({
        transaction: sponsoredTx,
      });

      // STEP 5: Execute with BOTH signatures (user + sponsor)
      console.log('Executing with dual signatures...');
      const result = await client.executeTransactionBlock({
        transactionBlock: userSignature.bytes,
        signature: [userSignature.signature, data.sponsoredTransaction.signature],
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      console.log('Sponsored transaction executed:', result.digest);

      return {
        digest: result.digest,
        effects: result.effects,
        sponsored: true,
      };

    } catch (error) {
      console.error('Error in sponsored transaction:', error);
      console.log('Falling back to user-paid gas');
      return await executeWithUserGas(tx);
    }
  }, [client, currentAccount, isSponsorshipEnabled, signTransaction, signAndExecute]);

  // Execute transaction with user's gas (fallback)
  const executeWithUserGas = async (
    tx: Transaction
  ): Promise<SponsoredTransactionResult> => {
    if (!currentAccount?.address) {
      throw new Error('No wallet connected');
    }

    console.log('Executing with user-paid gas...');

    // User signs and pays for gas with their wallet
    const result = await signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (result) => {
        console.log('Transaction executed with user gas:', result.digest);
      },
    });

    return {
      digest: result.digest,
      effects: result.effects,
      sponsored: false,
    };
  };

  // Check sponsor health
  const checkSponsorHealth = useCallback(async (): Promise<{
    operational: boolean;
    sponsor?: string;
    balance?: string;
  }> => {
    try {
      const response = await fetch('/api/sponsor', {
        method: 'GET',
      });

      const data = await response.json();

      return {
        operational: data.status === 'operational',
        sponsor: data.sponsor,
        balance: data.balance?.formatted,
      };
    } catch (error) {
      console.error('Failed to check sponsor health:', error);
      return { operational: false };
    }
  }, []);

  return {
    executeWithSponsor,
    checkSponsorHealth,
    isSponsored: isSponsorshipEnabled(),
  };
}

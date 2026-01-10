import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import { useCallback } from 'react';

/**
 * Gas Sponsorship Hook
 *
 * This hook wraps transaction execution with gas sponsorship functionality.
 * It sends transactions to the backend sponsor endpoint, which signs them
 * with the sponsor wallet to pay for gas.
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
  signedTransaction?: {
    transactionBlockBytes: Uint8Array;
    signature: string;
    sponsor: string;
  };
  error?: string;
  details?: string;
}

export function useGasSponsor() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Check if gas sponsorship is enabled
  const isSponsorshipEnabled = useCallback((): boolean => {
    return process.env.NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED === 'true';
  }, []);

  // Execute transaction with gas sponsorship
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
      // Serialize the transaction object itself (not built bytes)
      const transactionBytes = toBase64(tx.serialize());

      // Send to sponsor endpoint
      const response = await fetch('/api/sponsor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionBytes,
          sender: currentAccount.address,
        }),
      });

      const data: SponsorResponse = await response.json();

      if (!response.ok || !data.success || !data.signedTransaction) {
        console.error('Gas sponsorship failed:', data.error);
        console.log('Falling back to user-paid gas');
        return await executeWithUserGas(tx);
      }

      // Now the user needs to sign the sponsored transaction
      console.log('Executing sponsored transaction...');
      console.log('Sponsor:', data.signedTransaction.sponsor);

      // The sponsor has provided signed transaction bytes
      // We need the user to also sign via their wallet
      const userSignedTx = await signAndExecute({
        transaction: tx,
      }, {
        onSuccess: (result) => {
          console.log('Sponsored transaction executed:', result.digest);
        },
      });

      return {
        digest: userSignedTx.digest,
        effects: userSignedTx.effects,
        sponsored: true,
      };

    } catch (error) {
      console.error('Error in sponsored transaction:', error);
      console.log('Falling back to user-paid gas');
      return await executeWithUserGas(tx);
    }
  }, [client, currentAccount, isSponsorshipEnabled, signAndExecute]);

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

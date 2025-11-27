import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export class GasSponsor {
  private client: SuiClient;
  private sponsorKeypair: Ed25519Keypair;
  private maxGasPerTx: number;

  constructor(
    client: SuiClient,
    sponsorKeypair: Ed25519Keypair,
    maxGasPerTx: number = 50_000_000 // 0.05 OCT default
  ) {
    this.client = client;
    this.sponsorKeypair = sponsorKeypair;
    this.maxGasPerTx = maxGasPerTx;
  }

  /**
   * Sponsor a transaction by providing gas payment
   */
  async sponsorTransaction(
    tx: Transaction,
    userAddress: string
  ): Promise<string> {
    // Set user as sender
    tx.setSender(userAddress);

    // Get sponsor's coins for gas
    const sponsorAddress = this.sponsorKeypair.toSuiAddress();
    const coins = await this.client.getAllCoins({
      owner: sponsorAddress,
    });

    if (coins.data.length === 0) {
      throw new Error('Sponsor has no coins for gas');
    }

    

    // Use first coin as gas payment
    const gasCoin = coins.data[0];
    tx.setGasPayment([
      {
        objectId: gasCoin!.coinObjectId,
        version: gasCoin!.version,
        digest: gasCoin!.digest,
      },
    ]);

    // Set gas budget
    tx.setGasBudget(this.maxGasPerTx);

    // Set gas owner to sponsor
    tx.setGasOwner(sponsorAddress);

    // Build transaction bytes
    const txBytes = await tx.build({ client: this.client });

    // Sponsor signs the transaction
    const sponsorSignature = await this.sponsorKeypair.signTransaction(
      txBytes
    );

    return JSON.stringify({
      txBytes: Array.from(txBytes),
      sponsorSignature: sponsorSignature.signature,
    });
  }

  /**
   * Execute sponsored transaction with user signature
   */
  async executeSponsored(
    txBytes: Uint8Array,
    userSignature: string,
    sponsorSignature: string
  ): Promise<any> {
    const result = await this.client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: [userSignature, sponsorSignature],
    });

    return result;
  }
}
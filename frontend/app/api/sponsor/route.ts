import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';
import { getSuiClient } from '@/lib/suiClient';

/**
 * Gas Sponsorship API Route
 *
 * This endpoint receives an unsigned transaction from the frontend,
 * signs it with the sponsor wallet, and returns the signed transaction
 * bytes for the user to submit to the network.
 *
 * Flow:
 * 1. Frontend builds transaction
 * 2. Frontend sends transaction bytes to this endpoint
 * 3. Backend signs with sponsor wallet
 * 4. Frontend submits signed transaction
 */

// Sponsor wallet keypair (loaded from environment variable)
function getSponsorKeypair(): Ed25519Keypair {
  const privateKey = process.env.SPONSOR_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('SPONSOR_PRIVATE_KEY environment variable not set');
  }

  try {
    // Support both Bech32 (suiprivkey1...) and base64 formats
    if (privateKey.startsWith('suiprivkey')) {
      // Bech32 format - use the fromSecretKey method with the key directly
      return Ed25519Keypair.fromSecretKey(privateKey);
    } else {
      // Base64 format
      const privateKeyBytes = fromBase64(privateKey);
      return Ed25519Keypair.fromSecretKey(privateKeyBytes);
    }
  } catch (error) {
    throw new Error('Invalid SPONSOR_PRIVATE_KEY format. Must be Bech32 (suiprivkey1...) or base64 encoded.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionBytes, sender } = body;

    // Validate request
    if (!transactionBytes || !sender) {
      return NextResponse.json(
        { error: 'Missing transactionBytes or sender address' },
        { status: 400 }
      );
    }

    // Get sponsor keypair
    const sponsorKeypair = getSponsorKeypair();
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();

    console.log('Gas Sponsorship Request:', {
      sender,
      sponsor: sponsorAddress,
      timestamp: new Date().toISOString(),
    });

    // Initialize Sui client
    const client = getSuiClient();

    // Deserialize the transaction from the serialized bytes
    const txBytes = fromBase64(transactionBytes);
    const tx = Transaction.from(txBytes);

    // Set the sender and sponsor (gas owner)
    tx.setSender(sender);
    tx.setGasOwner(sponsorAddress);

    // Build the transaction to get gas estimation and select gas coins
    await tx.build({ client });

    // Sign the transaction with both user (for execution) and sponsor (for gas)
    const { bytes, signature: sponsorSignature } = await tx.sign({
      client,
      signer: sponsorKeypair,
    });

    // Return the signed transaction data
    return NextResponse.json({
      success: true,
      signedTransaction: {
        transactionBlockBytes: bytes,
        signature: sponsorSignature,
        sponsor: sponsorAddress,
      },
    });

  } catch (error) {
    console.error('Gas sponsorship error:', error);

    return NextResponse.json(
      {
        error: 'Failed to sponsor transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const sponsorKeypair = getSponsorKeypair();
    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();

    // Check sponsor balance
    const client = getSuiClient();
    const balance = await client.getBalance({
      owner: sponsorAddress,
    });

    return NextResponse.json({
      status: 'operational',
      sponsor: sponsorAddress,
      balance: {
        total: balance.totalBalance,
        formatted: `${Number(balance.totalBalance) / 1_000_000_000} OCT`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { SuiClient } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { configDotenv } from "dotenv";
configDotenv()
// Setup
const clien = new SuiClient({ url: "https://rpc-testnet.onelabs.cc:443" });
const keypair = Ed25519Keypair.deriveKeypair(process.env.SEED!); // From `one keytool export`
const packageId = '0xb3b75e02a830284ee0e905bf8e3c15d88ae5697336bfa1f65b267edf1bf5032d';

async function splitPayment() {
  const tx = new TransactionBlock();
  console.log(keypair.toSuiAddress())
  const coins = await clien.getAllCoins({
    owner : keypair.toSuiAddress()
  })


  // Split coins
  tx.setGasPayment([{
    digest : coins.data[0]?.digest!,
    objectId : coins.data[0]?.coinObjectId!,
    version : coins.data[0]?.version!
  }])
    const payment = tx.splitCoins(tx.gas, [1000])[0]!;
  
  // Call your function
  tx.moveCall({
    target: `${packageId}::payment_splitter::split_payment`,
    arguments: [
      payment,
      tx.pure([
        '0x7e6455259cd0eb227d85b0273c06d144d8b67aec78b1e6f23981df93e52d9a1b',
        '0x7e6455259cd0eb227d85b0273c06d144d8b67aec78b1e6f23981df93e52d9a1b'
      ]),
      tx.pure([600, 400])
    ],
  });

  
  
  // Execute
  const result = await clien.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
    
  });
  
  console.log('Success!', result.digest);
}

splitPayment();
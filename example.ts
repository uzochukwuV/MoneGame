import { configDotenv } from 'dotenv';
import { MajorityRulesClient, Tier } from './game_onchain/src/index';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
configDotenv()

async function playGame() {
  // === SETUP ===
  const packageId = '0x16d2cab2772b1fc4372cefe3a50c76bc3c18feb9b7b685f56cd7b46c9e923d0a';

  // Sponsor (pays gas for all transactions)
  const sponsorKeypair = Ed25519Keypair.deriveKeypair(
    process.env.SEED!
  );

  // Player (only pays entry fee)
  const playerKeypair = Ed25519Keypair.deriveKeypair(
    'scrap exit inform protect game october rose hurry bamboo method early floor'
  );

  // Initialize client
  const client = new MajorityRulesClient({
    packageId,
    network: 'testnet',
  });

  // Enable gas sponsorship
  client.enableSponsor(sponsorKeypair, 50_000_000); // Max 0.05 OCT per tx

  console.log('🎮 MAJORITY RULES - Gasless Game');
  console.log('Player:', playerKeypair.toSuiAddress());
  console.log('Sponsor:', sponsorKeypair.toSuiAddress());

  // === CREATE GAME (gasless) ===
  console.log('\n📝 Creating game...');
  const createTx = await client.createGame(Tier.TIER_1, playerKeypair, true);
  console.log('✅ Game created:', createTx);

//   // 1. Check game state
// const state = await client.getFullGameState(gameId, playerAddress);

// // 2. Display voting progress (during voting)
// const answerCount = await client.getAnswerCount(gameId);
// const totalPlayers = state.gameInfo.playerCount - state.gameInfo.eliminatedCount;
// console.log(`${answerCount}/${totalPlayers} players have voted`);

// // 3. Display voting results (after deadline)
// try {
//   const stats = await client.getVotingStats(gameId);
//   console.log(`A: ${stats.votesA}, B: ${stats.votesB}, C: ${stats.votesC}`);
// } catch (error) {
//   console.log('Voting still in progress');
// }

// // 4. Check if player can claim prize
// if (await client.canClaimPrize(gameId, playerAddress)) {
//   await client.claimPrize(gameId);
// }

// // 5. Get survivors list
// const survivors = await client.getSurvivors(gameId);
// console.log(`${survivors.length} players survived!`);

  // Get game ID from events (you'd parse this from transaction result)
  const gameId = '0xGAME_OBJECT_ID';

  // === JOIN GAME (gasless - sponsor pays gas, player pays entry fee) ===
  console.log('\n👥 Joining game...');
  const joinTx = await client.joinGame(Tier.TIER_1, gameId, playerKeypair, true);
  console.log('✅ Joined:', joinTx);

  // === START GAME (gasless) ===
  console.log('\n🚀 Starting game...');
  const startTx = await client.startGame(gameId, playerKeypair, true);
  console.log('✅ Started:', startTx);

  // === ASK QUESTION (gasless) ===
  console.log('\n❓ Asking question...');
  const askTx = await client.askQuestion(
    gameId,
    'Best color?',
    'Red',
    'Blue',
    'Green',
    1, // I pick Red
    playerKeypair,
    true
  );
  console.log('✅ Question asked:', askTx);

  // === SUBMIT ANSWER (gasless) ===
  console.log('\n✍️ Submitting answer...');
  const answerTx = await client.submitAnswer(gameId, 2, playerKeypair, true);
  console.log('✅ Answer submitted:', answerTx);

  // === FINALIZE ROUND (gasless) ===
  console.log('\n🏁 Finalizing round...');
  const finalizeTx = await client.finalizeRound(gameId, playerKeypair, true);
  console.log('✅ Round finalized:', finalizeTx);

  // === CLAIM PRIZE (user pays gas - they're winning money!) ===
  console.log('\n💰 Claiming prize...');
  const claimTx = await client.claimPrize(gameId, playerKeypair);
  console.log('✅ Prize claimed:', claimTx);
}

playGame().catch(console.error);
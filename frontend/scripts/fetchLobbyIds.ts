/**
 * Script to fetch the correct Tier Lobby IDs from the blockchain
 * Run with: npx tsx scripts/fetchLobbyIds.ts
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const GAME_PACKAGE_ID = '0x18a05df19f0a609ff47c6cc4fbddc558bb9097e7a757b769d412659b696bb879';
const RPC_URL = 'https://rpc-testnet.onelabs.cc:443';

async function fetchLobbyIds() {
  console.log('🔍 Fetching Tier Lobby IDs from blockchain...\n');

  const client = new SuiClient({ url: RPC_URL });

  try {
    // Query TierLobbyCreated events
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${GAME_PACKAGE_ID}::battle_royale::TierLobbyCreated`,
      } as any,
      limit: 10,
      order: 'ascending',
    });

    if (!events.data || events.data.length === 0) {
      console.error('❌ No TierLobbyCreated events found!');
      console.log('Make sure the contract has been deployed and tier lobbies have been created.');
      return;
    }

    console.log(`✅ Found ${events.data.length} TierLobbyCreated events\n`);

    // Parse and display lobby IDs
    const lobbies: Record<number, string> = {};

    events.data.forEach((event) => {
      const data = event.parsedJson as any;
      const tier = parseInt(data.tier);
      const lobbyId = data.lobby_id;
      const entryFee = data.entry_fee;

      lobbies[tier] = lobbyId;

      console.log(`Tier ${tier}:`);
      console.log(`  Lobby ID: ${lobbyId}`);
      console.log(`  Entry Fee: ${entryFee} MIST (${Number(entryFee) / 1_000_000_000} OCT)`);
      console.log('');
    });

    // Generate the constants code
    console.log('\n📝 Copy this to your lib/constants.ts:\n');
    console.log('export const TIER_LOBBY_IDS: Record<number, string> = {');
    Object.entries(lobbies)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([tier, lobbyId]) => {
        console.log(`  ${tier}: '${lobbyId}',`);
      });
    console.log('};\n');

  } catch (error) {
    console.error('❌ Error fetching lobby IDs:', error);
  }
}

fetchLobbyIds();

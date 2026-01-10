// OneChain Network Configuration
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

// Smart Contract Package ID (OneChain Deployed)
export const GAME_PACKAGE_ID = process.env.NEXT_PUBLIC_GAME_PACKAGE_ID || '0x18a05df19f0a609ff47c6cc4fbddc558bb9097e7a757b769d412659b696bb879';

// Deployed Shared Objects
export const BADGE_REGISTRY_ID = '0x7824cb0f993210206d0eaf4c8b1ef1cfa2f6532275b3172e9aaeade314e9d43d';
export const ITEM_SHOP_ID = '0x7581b5762c79b821df47482bef07a3c7f3cc08f101c804fcfcb1271d88621856';
export const PLATFORM_TREASURY_ID = '0x355955adda97ff6bd60bc8f3b2ec221076aaa396b9473558f41314b7badc7503';

// Tier Lobby IDs (OneChain) - fetched from TierLobbyCreated events
export const TIER_LOBBY_IDS: Record<number, string> = {
  1: '0x6a07b6cdfb6a6a520153fedc7d4adf3227ec5becaf67d7eef175c93423872e3d',
  2: '0x25224aa39be813d68d756b4616121c81b80f19e1a9034fda5771886fa043d076',
  3: '0x10fa30fbc9ac4eaf63dfa50e17104f338129acdd998fd03415cf90bdc624f7e0',
  4: '0xaa7574baf0736eaf5be39319eb88858cc0884850b184f17441ca4fecb92cdc73',
  5: '0x999914fbf4720489b3909904ff5a819dde1d3e2c640d73029902cb476bf88009',
};

// Sui Clock Object (shared object at 0x6)
export const CLOCK_OBJECT = '0x0000000000000000000000000000000000000000000000000000000000000006';

// RPC Endpoints
export const RPC_ENDPOINTS = {
  testnet: process.env.NEXT_PUBLIC_TESTNET_RPC || 'https://rpc-testnet.onelabs.cc:443',
  mainnet: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://rpc-mainnet.onelabs.cc:443',
} as const;

// Game Constants (from smart contract)
export const MAX_PLAYERS_PER_GAME = 50;
export const MIN_PLAYERS_TO_START = 2;
export const MAX_ROUNDS = 3;
export const QUESTION_TIME_MS = 120_000; // 2 minutes
export const ANSWER_TIME_MS = 60_000; // 1 minute

// Tier Configuration
export enum Tier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
  TIER_5 = 5,
}

// Entry fees in MIST (1 OCT = 1_000_000_000 MIST)
export const TIER_FEES: Record<Tier, number> = {
  [Tier.TIER_1]: 10_000_000,       // 0.01 OCT
  [Tier.TIER_2]: 100_000_000,      // 0.1 OCT
  [Tier.TIER_3]: 1_000_000_000,    // 1 OCT
  [Tier.TIER_4]: 10_000_000_000,   // 10 OCT
  [Tier.TIER_5]: 100_000_000_000,  // 100 OCT
};

export const TIER_NAMES: Record<Tier, string> = {
  [Tier.TIER_1]: 'Casual',
  [Tier.TIER_2]: 'Rookie',
  [Tier.TIER_3]: 'Pro',
  [Tier.TIER_4]: 'Elite',
  [Tier.TIER_5]: 'Whale',
};

// Game Status
export enum GameStatus {
  WAITING = 0,
  ACTIVE = 1,
  FINISHED = 2,
  CANCELLED = 3,
}

// Gas Sponsorship Configuration
export const GAS_SPONSORSHIP_ENABLED = process.env.NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED === 'true';
export const MAX_SPONSORED_GAS = 50_000_000; // 0.05 OCT max per transaction

// Polling intervals
export const LOBBY_POLL_INTERVAL = 2000; // 2 seconds
export const ACTIVE_GAME_POLL_INTERVAL = 1500; // 1.5 seconds

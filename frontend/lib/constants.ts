// OneChain Network Configuration
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

// Smart Contract Package ID (OneChain Deployed)
export const GAME_PACKAGE_ID = process.env.NEXT_PUBLIC_GAME_PACKAGE_ID || '0x13a8505d76d814f8caa1de1bc68331884012e8de93e4b95d6eb1220cf7cd7ca2';

// Deployed Shared Objects
export const BADGE_REGISTRY_ID = '0x978e6f64735a70b98a6ddff41987088ea44942f1eebb6bf9d61b0d66755098f4';
export const ITEM_SHOP_ID = '0x7cb21cc778a881f9cb7796d32db6f4605948081da75eaf65c759fb20b1e82d42';
export const PLATFORM_TREASURY_ID = '0x3bc6d18e1b6a76891cf93898d64615e23a0bee4fdfcffad7832ee4e059dfb0b6';

// Tier Lobby IDs (OneChain) - fetched from TierLobbyCreated events
export const TIER_LOBBY_IDS: Record<number, string> = {
  1: '0xdc6461e07e55a063f23803c6ee1de0d1d4a757168576692d7051a839e06bdaa5',
  2: '0x727896abb9bdc76bedddc870c7a1722db431e9e138ad1647042226ec8f1ab471',
  3: '0x7efb8da0734f07d7673248003e367198853574cd2ba119be97b5611cc4bbe17f',
  4: '0x67cb836e770482bf59501f30b67379f8976c40c541061cd3779d5cc9a77f86b2',
  5: '0x5b63deebd70af659d7d73d6ac23436be685678b9b7e1a3a3a5cd7185adf38369',
};

// Sui Clock Object (shared object at 0x6)
export const CLOCK_OBJECT = '0x0000000000000000000000000000000000000000000000000000000000000006';

// HACKATHON Token (payment token for games)
export const HACKATHON_COIN_TYPE = '0x8b76fc2a2317d45118770cefed7e57171a08c477ed16283616b15f099391f120::hackathon::HACKATHON';
export const TOKEN_SYMBOL = 'HACKATHON';

// RPC Endpoints
export const RPC_ENDPOINTS = {
  testnet: process.env.NEXT_PUBLIC_TESTNET_RPC || 'https://rpc-testnet.onelabs.cc:443',
  mainnet: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://rpc-mainnet.onelabs.cc:443',
} as const;

// Game Constants (from smart contract)
export const MAX_PLAYERS_PER_GAME = 50;
export const MIN_PLAYERS_TO_START = 4; // Updated to match contract
export const MAX_ROUNDS = 3;
export const QUESTION_TIME_MS = 120_000; // 2 minutes
export const ANSWER_TIME_MS = 150_000; // 2.5 minutes (updated from contract)

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

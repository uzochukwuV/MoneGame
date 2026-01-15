// OneChain Network Configuration
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

// Smart Contract Package ID (OneChain Deployed)
export const GAME_PACKAGE_ID = process.env.NEXT_PUBLIC_GAME_PACKAGE_ID || '0xe5dab0e0ea1bd57bc52b2b3e9de99e157e028fc35f8fb86429484172010d6b46';

// Deployed Shared Objects
export const BADGE_REGISTRY_ID = '0xa21775be2f92a7a455a44eae23f3a5ebc7d0bc7311831a4d8c3b6c6630fd2904';
export const ITEM_SHOP_ID = '0x35223674cde35e9d8ef90c725fb560da2a41f370439f6f794c4eda43e96293c8';
export const PLATFORM_TREASURY_ID = '0xea8e0485905f64d4d8c7350138442d3213d4c4c5dfda755fb994b08738e0b4ce';

// Tier Lobby IDs (OneChain) - fetched from TierLobbyCreated events
export const TIER_LOBBY_IDS: Record<number, string> = {
  1: '0x14758175d4e9321accde6c0e0fbe64d426729bcd862bf4948b89a37abdc01404',
  2: '0xcff37aa9df273b140f033fa7d48ed1433a232d572e90bfb06794917fc15d25ea',
  3: '0x45ed6c095f2fcfdb0eb8885a5c521ae3388d46d54f9a15a8127598ec92b9c2dd',
  4: '0x78597617c802c557b6e4888e90718e55533b576dac076d0cf405349569a500a2',
  5: '0xd8a53952e0e53230941108a258daf413a7eb2deb940a7f72b6023c1c6b4ebb44',
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

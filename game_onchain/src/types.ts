export interface GameConfig {
  packageId: string;
  network: 'testnet' | 'mainnet' | 'devnet';
  rpcUrl?: string;
}

export interface SponsorConfig {
  sponsorKeypair: any; // Ed25519Keypair
  maxGasPerTx?: number;
}

export enum Tier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
  TIER_5 = 5,
}

export const TIER_FEES: Record<Tier, number> = {
  [Tier.TIER_1]: 10_000_000, // 0.01 OCT
  [Tier.TIER_2]: 100_000_000, // 0.1 OCT
  [Tier.TIER_3]: 1_000_000_000, // 1 OCT
  [Tier.TIER_4]: 10_000_000_000, // 10 OCT
  [Tier.TIER_5]: 100_000_000_000, // 100 OCT
};

export interface GameInfo {
  gameId: string;
  tier: number;
  status: number;
  currentRound: number;
  playerCount: number;
  eliminatedCount: number;
  prizePool: number;
  currentQuestioner: string;
  questionAsked: boolean;
}

export interface PlayerTicket {
  ticketId: string;
  gameId: string;
  player: string;
  tier: number;
  points: number;
  endingRound: number;
  survived: boolean;
}
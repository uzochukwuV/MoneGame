export const enum Tier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
  TIER_5 = 5,
}

// TIER_FEES in MIST (1 OCT = 1 billion MIST)
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

export const enum GameStatus {
  WAITING = 0,
  ACTIVE = 1,
  FINISHED = 2,
  CANCELLED = 3,
}

export interface GameInfo {
  gameId: string;
  tier: Tier;
  status: GameStatus;
  currentRound: number;
  playerCount: number;
  eliminatedCount: number;
  prizePool: number;
  currentQuestioner: string;
  questionAsked: boolean;
}

export interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
}

export interface VotingStats {
  votesA: number;
  votesB: number;
  votesC: number;
}

export interface GameState {
  gameInfo: GameInfo | null;
  isPlayerInGame: boolean;
  isPlayerEliminated: boolean;
  hasPlayerAnswered: boolean;
  playerAnswer: number | null;
  question: Question | null;
  timeRemaining: number;
  answerCount: number;
  votingStats: VotingStats | null;
  survivors: string[];
  canClaimPrize: boolean;
}

export interface Player {
  address: string;
  isEliminated: boolean;
  points: number;
}

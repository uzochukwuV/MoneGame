// Game Types based on smart contract

export enum Tier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
  TIER_5 = 5,
}

export enum GameStatus {
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
  prizePool: number; // in OCT
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
  majority: number;
  totalVotes: number;
}

export interface GameData {
  gameId: string;
  tier: number;
  status: number;
  currentRound: number;
  players: string[];
  eliminated: string[];
  prizePool: string;
  currentQuestioner: string;
  question: {
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
  } | null;
  answers: Record<string, number>;
}

export interface PlayerStatus {
  isInGame: boolean;
  isEliminated: boolean;
  hasAnswered: boolean;
  answer: number | null;
}

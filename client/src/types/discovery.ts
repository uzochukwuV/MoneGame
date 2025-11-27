/**
 * Game Discovery Types
 * Types for browsing and discovering games on the blockchain
 */

import { Tier, GameStatus } from './game';

/**
 * Game listing for discovery/browsing
 * Contains essential info about a game without full game state
 */
export interface AvailableGame {
  /** Unique game object ID on blockchain */
  gameId: string;

  /** Game tier (1-5) */
  tier: Tier;

  /** Current game status */
  status: GameStatus;

  /** Number of players currently in game */
  playerCount: number;

  /** Maximum players allowed (50) */
  maxPlayers: number;

  /** Current prize pool in MIST */
  prizePool: string;

  /** Entry fee in MIST */
  entryFee: string;

  /** Current round number */
  currentRound: number;

  /** How many players are eliminated */
  eliminatedCount: number;

  /** Timestamp when game was created */
  createdAt?: number;
}

/**
 * Filtered/sorted games for display
 */
export interface GameListState {
  games: AvailableGame[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

/**
 * Sort options for game list
 */
export type GameSortBy = 'players' | 'prize' | 'newest' | 'tier';

/**
 * Filter options for game list
 */
export interface GameFilters {
  tier?: Tier;
  minPlayers?: number;
  maxPlayers?: number;
  sortBy?: GameSortBy;
}

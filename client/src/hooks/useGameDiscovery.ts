/**
 * useGameDiscovery Hook
 *
 * Fetches available games from blockchain using event indexing
 * Queries GameCreated and PlayerJoined events to build game list
 * Auto-refreshes to show real-time player counts
 */

import { useState, useEffect, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import type { Tier, GameStatus } from '../types/game';
import type { AvailableGame, GameFilters } from '../types/discovery';
import { GAME_PACKAGE_ID } from '../config/game';

interface UseGameDiscoveryProps {
  packageId?: string;
  refreshInterval?: number; // ms between refreshes
  autoRefresh?: boolean;
}

interface DiscoveryState {
  games: AvailableGame[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export function useGameDiscovery({
  packageId = GAME_PACKAGE_ID,
  refreshInterval = 1000000, // 5 seconds
  autoRefresh = true,
}: UseGameDiscoveryProps = {}) {
  const suiClient = useSuiClient();
  const [state, setState] = useState<DiscoveryState>({
    games: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
  });

  /**
   * Fetch all games from blockchain
   * Strategy:
   * 1. Query GameCreated events to find all game object IDs
   * 2. For each game, fetch full object to get current state
   * 3. Filter for WAITING status only
   * 4. Enrich with player count and prize pool data
   *
   * TESTING: Integrated console.log statements for debugging
   */
  const fetchGames = useCallback(async () => {
    console.log('🔍 [useGameDiscovery] Fetching games from blockchain...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Query all GameCreated events to get game IDs
      console.log('📡 [useGameDiscovery] Querying GameCreated events...');
      const gameCreatedEvents = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::battle_royale::GameCreated`,
        } as any,
        limit: 100, // Fetch up to 100 games
        order: 'descending', // Most recent first
      });

      console.log('📊 [useGameDiscovery] GameCreated events:', {
        count: gameCreatedEvents.data?.length || 0,
        events: gameCreatedEvents.data?.slice(0, 3),
      });

      if (!gameCreatedEvents.data || gameCreatedEvents.data.length === 0) {
        console.log('📭 [useGameDiscovery] No games found on blockchain');
        setState(prev => ({
          ...prev,
          games: [],
          isLoading: false,
          lastUpdated: Date.now(),
        }));
        return;
      }

      // Step 2: Extract game IDs from events
      console.log('🎲 [useGameDiscovery] Extracting game IDs from events...');
      const gameIds = gameCreatedEvents.data
        .map(event => {
          const data = event.parsedJson as any;
          return data?.game_id || null;
        })
        .filter((id): id is string => id !== null);

      console.log('📝 [useGameDiscovery] Game IDs extracted:', gameIds);

      // Step 3: Fetch full game objects
      console.log('📥 [useGameDiscovery] Fetching full game objects...');
      const gameObjects = await Promise.all(
        gameIds.map(gameId =>
          suiClient
            .getObject({
              id: gameId,
              options: {
                showContent: true,
                showOwner: false,
              },
            })
            .catch(err => {
              console.error(`❌ [useGameDiscovery] Failed to fetch game ${gameId}:`, err);
              return null;
            })
        )
      );

      console.log('✅ [useGameDiscovery] Game objects fetched:', {
        total: gameObjects.length,
        successful: gameObjects.filter(g => g !== null).length,
        failed: gameObjects.filter(g => g === null).length,
      });

      console.log(gameObjects)

      // Step 4: Transform objects into AvailableGame entries
      console.log('🔄 [useGameDiscovery] Transforming objects to AvailableGame format...');
      const availableGames: AvailableGame[] = gameObjects
        .map((obj, index) => {
          if (!obj?.data?.content || obj.data.content.dataType !== 'moveObject') {
            console.log(`⚠️ [useGameDiscovery] Game ${index}: Invalid object format`);
            return null;
          }

          const fields = (obj.data.content as any).fields;
          const gameId = gameIds[index];

          // Parse status - handle both number and string
          const status = typeof fields.status === 'string' ? parseInt(fields.status) : fields.status;

          // Only include WAITING games (status === 0)
          if (status !== 0) {
            console.log(`⏭️ [useGameDiscovery] Game ${gameId}: Skipping (status ${status} !== WAITING)`);
            return null;
          }

          // Parse players array
          const players = Array.isArray(fields.players) ? fields.players : [];
          const eliminated = Array.isArray(fields.eliminated) ? fields.eliminated : [];

          // Parse numeric fields - handle both string and number
          const parseNum = (val: any) => {
            if (typeof val === 'string') return parseInt(val);
            return val || 0;
          };

          const game: AvailableGame = {
            gameId,
            tier: parseNum(fields.tier) as Tier,
            status: status as GameStatus,
            playerCount: players.length,
            maxPlayers: 50,
            prizePool: fields.prize_pool?.toString() || '0',
            entryFee: fields.entry_fee?.toString() || '0',
            currentRound: parseNum(fields.current_round),
            eliminatedCount: eliminated.length,
            createdAt: gameCreatedEvents.data[index]?.timestampMs ? Number(gameCreatedEvents.data[index]?.timestampMs) : undefined,
          };

          console.log(`🎮 [useGameDiscovery] Processed game:`, {
            id: gameId.slice(0, 8) + '...',
            tier: game.tier,
            players: game.playerCount,
            prizePool: Number(game.prizePool) / 1_000_000_000 + ' OCT',
          });

          return game;
        })
        .filter((game): game is AvailableGame => game !== null)
        .sort((a, b) => {
          const aTime = a.createdAt || 0;
          const bTime = b.createdAt || 0;
          return bTime - aTime;
        }); // Sort by newest first

      console.log('📈 [useGameDiscovery] FINAL RESULT:', {
        totalWaitingGames: availableGames.length,
        games: availableGames.map(g => ({
          id: g.gameId.slice(0, 8) + '...',
          tier: g.tier,
          players: g.playerCount,
        })),
      });

      setState(prev => ({
        ...prev,
        games: availableGames,
        isLoading: false,
        lastUpdated: Date.now(),
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch games';
      console.error('❌ [useGameDiscovery] Error:', {
        message: errorMsg,
        error: err,
        timestamp: new Date().toISOString(),
      });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
    }
  }, [suiClient, packageId]);

  /**
   * Set up auto-refresh interval
   */
  useEffect(() => {
    if (!packageId || packageId.includes('YOUR_PACKAGE_ID')) {
      setState(prev => ({
        ...prev,
        error: 'Package ID not configured. Update GAME_PACKAGE_ID in config.',
      }));
      return;
    }

    // Fetch immediately on mount
    fetchGames();

    // Set up auto-refresh if enabled
   let interval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchGames();
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchGames, packageId, refreshInterval, autoRefresh]);

  /**
   * Filter and sort games
   */
  const filterGames = useCallback(
    (filters: GameFilters): AvailableGame[] => {
      let filtered = [...state.games];

      // Filter by tier
      if (filters.tier !== undefined) {
        filtered = filtered.filter(game => game.tier === filters.tier);
      }

      // Filter by player count range
      if (filters.minPlayers !== undefined) {
        filtered = filtered.filter(game => game.playerCount >= filters.minPlayers!);
      }
      if (filters.maxPlayers !== undefined) {
        filtered = filtered.filter(game => game.playerCount <= filters.maxPlayers!);
      }

      // Sort
      switch (filters.sortBy) {
        case 'players':
          return filtered.sort((a, b) => b.playerCount - a.playerCount);
        case 'prize':
          return filtered.sort(
            (a, b) => Number(b.prizePool) - Number(a.prizePool)
          );
        case 'tier':
          return filtered.sort((a, b) => a.tier - b.tier);
        case 'newest':
        default:
          return filtered;
      }
    },
    [state.games]
  );

  /**
   * Get games for a specific tier
   */
  const getGamesByTier = useCallback(
    (tier: Tier): AvailableGame[] => {
      return filterGames({ tier, sortBy: 'players' });
    },
    [filterGames]
  );

  /**
   * Get all waiting games across all tiers
   */
  const getAllGames = useCallback((): AvailableGame[] => {
    return state.games;
  }, [state.games]);

  /**
   * Get games with minimum players (for "nearly full" games)
   */
  const getPopularGames = useCallback(
    (minPlayers: number = 5): AvailableGame[] => {
      return filterGames({ minPlayers, sortBy: 'players' });
    },
    [filterGames]
  );

  /**
   * Manually refresh games list
   */
  const refresh = useCallback(() => {
    fetchGames();
  }, [fetchGames]);

  return {
    // State
    games: state.games,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Methods
    fetchGames,
    refresh,
    filterGames,
    getGamesByTier,
    getAllGames,
    getPopularGames,
  };
}

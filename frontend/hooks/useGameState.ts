import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { GAME_PACKAGE_ID, GameStatus, LOBBY_POLL_INTERVAL, ACTIVE_GAME_POLL_INTERVAL } from '@/lib/constants';

export interface Player {
  address: string;
  role?: 'citizen' | 'saboteur';
  isAlive: boolean;
  joinedAt?: number;
}

export interface GameState {
  gameId: string;
  tier: number;
  status: GameStatus;
  players: Player[];
  currentRound: number;
  maxRounds: number;
  prizePool: string;
  creator: string;
  current_questioner: string;
  currentQuestion?: string;
  questionDeadline?: number;
  answerDeadline?: number;
  votingPhase?: 'question' | 'answer' | 'elimination';
}

/**
 * Hook to fetch and track game state with real-time updates
 */
export function useGameState(gameId: string | null) {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    try {
      const gameObject = await client.getObject({
        id: gameId,
        options: { showContent: true },
      });

      if (!gameObject.data?.content || gameObject.data.content.dataType !== 'moveObject') {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const fields = (gameObject.data.content as any).fields;

      // Parse players array
      const allPlayers = Array.isArray(fields.players) ? fields.players : [];
      const eliminatedPlayers = Array.isArray(fields.eliminated) ? fields.eliminated : [];

      const players: Player[] = allPlayers.map((addr: string) => ({
        address: addr,
        isAlive: !eliminatedPlayers.includes(addr),
      }));

      // Parse status
      const status = typeof fields.status === 'string' ? parseInt(fields.status) : fields.status;

      const state: GameState = {
        gameId,
        tier: parseInt(fields.tier || '1'),
        status,
        players,
        currentRound: parseInt(fields.current_round || '0'),
        maxRounds: 3,
        prizePool: fields.prize_pool?.toString() || '0',
        creator: players[0]?.address || '',
        current_questioner: fields.current_questioner || '',
        currentQuestion: fields.question_text || undefined,
        questionDeadline: fields.question_asked ? undefined : (fields.deadline ? parseInt(fields.deadline) : undefined),
        answerDeadline: fields.question_asked ? (fields.deadline ? parseInt(fields.deadline) : undefined) : undefined,
      };

      setGameState(state);
      setError(null);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch game');
    } finally {
      setLoading(false);
    }
  }, [gameId, client]);

  // Poll for updates based on game status
  useEffect(() => {
    if (!gameId) return;

    fetchGameState();

    // Use different poll intervals based on game status
    const interval = gameState?.status === GameStatus.ACTIVE
      ? ACTIVE_GAME_POLL_INTERVAL
      : LOBBY_POLL_INTERVAL;

    const pollInterval = setInterval(fetchGameState, interval);

    return () => clearInterval(pollInterval);
  }, [gameId, gameState?.status, fetchGameState]);

  // Check if current user is in this game
  const isPlayerInGame = useCallback(() => {
    if (!currentAccount?.address || !gameState) return false;
    return gameState.players.some(p => p.address === currentAccount.address);
  }, [currentAccount, gameState]);

  return {
    gameState,
    loading,
    error,
    isPlayerInGame,
    refetch: fetchGameState,
  };
}

/**
 * Hook to find if user is currently in any active game
 */
export function useUserActiveGame() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkActiveGame = async () => {
      if (!currentAccount?.address) {
        setChecking(false);
        return;
      }

      try {
        // Query GameCreated events to find recent games
        const gameCreatedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${GAME_PACKAGE_ID}::battle_royale::GameCreated`,
          } as any,
          limit: 50,
          order: 'descending',
        });

        // Check each game to see if user is in it and it's active
        for (const event of gameCreatedEvents.data) {
          const data = event.parsedJson as any;
          const gameId = data?.game_id;

          if (!gameId) continue;

          try {
            const gameObject = await client.getObject({
              id: gameId,
              options: { showContent: true },
            });

            if (!gameObject.data?.content || gameObject.data.content.dataType !== 'moveObject') {
              continue;
            }

            const fields = (gameObject.data.content as any).fields;
            const status = typeof fields.status === 'string' ? parseInt(fields.status) : fields.status;
            const players = Array.isArray(fields.players) ? fields.players : [];

            // Check if user is in this game and it's waiting or active
            if (
              players.includes(currentAccount.address) &&
              (status === GameStatus.WAITING || status === GameStatus.ACTIVE)
            ) {
              setActiveGameId(gameId);
              setChecking(false);
              return;
            }
          } catch (err) {
            // Game might be deleted, continue
            continue;
          }
        }

        setActiveGameId(null);
      } catch (error) {
        console.error('Error checking active game:', error);
      } finally {
        setChecking(false);
      }
    };

    checkActiveGame();
  }, [currentAccount, client]);

  return { activeGameId, checking };
}

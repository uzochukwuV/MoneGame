'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import Link from 'next/link';
import {
  TIER_NAMES,
  TIER_FEES,
  GAME_PACKAGE_ID,
  GameStatus,
  Tier
} from '@/lib/constants';
import { useGameActionsWithSponsor } from '@/hooks/useGameActionsWithSponsor';

interface GameInfo {
  gameId: string;
  tier: number;
  status: number;
  playerCount: number;
  maxPlayers: number;
  prizePool: string;
  creator: string;
  players: string[];
}

export default function DiscoverPage() {
  const params = useParams();
  const tier = parseInt(params.tier as string) as Tier;
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const { createGame, getGamesInLobby } = useGameActionsWithSponsor();

  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch games in this tier using event-based querying
  useEffect(() => {
    const fetchGames = async () => {
      console.log(`🔍 [Discover] Fetching games for tier ${tier}...`);
      try {
        setLoading(true);

        // Step 1: Query GameCreated events filtered by tier
        console.log(`📡 [Discover] Querying GameCreated events for tier ${tier}...`);
        const gameCreatedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${GAME_PACKAGE_ID}::battle_royale::GameCreated`,
          } as any,
          limit: 100,
          order: 'descending',
        });

        console.log(`📊 [Discover] Found ${gameCreatedEvents.data?.length || 0} total GameCreated events`);

        if (!gameCreatedEvents.data || gameCreatedEvents.data.length === 0) {
          console.log('📭 [Discover] No games found');
          setGames([]);
          setLoading(false);
          return;
        }

        // Step 2: Extract game IDs and filter by tier
        const gameIdsForTier = gameCreatedEvents.data
          .map(event => {
            const data = event.parsedJson as any;
            return {
              gameId: data?.game_id || null,
              eventTier: parseInt(data?.tier || '0'),
            };
          })
          .filter(item => item.gameId !== null && item.eventTier === tier)
          .map(item => item.gameId as string);

        console.log(`🎲 [Discover] Found ${gameIdsForTier.length} games for tier ${tier}`);

        if (gameIdsForTier.length === 0) {
          setGames([]);
          setLoading(false);
          return;
        }

        // Step 3: Fetch full game objects
        console.log('📥 [Discover] Fetching game objects...');
        const gameObjects = await Promise.all(
          gameIdsForTier.map(gameId =>
            client.getObject({
              id: gameId,
              options: { showContent: true },
            }).catch(err => {
              console.error(`❌ [Discover] Failed to fetch game ${gameId}:`, err);
              return null;
            })
          )
        );

        console.log(`✅ [Discover] Fetched ${gameObjects.filter(g => g !== null).length} game objects`);

        // Step 4: Transform to GameInfo
        const validGames: GameInfo[] = gameObjects
          .map((obj, index) => {
            if (!obj?.data?.content || obj.data.content.dataType !== 'moveObject') {
              return null;
            }

            const fields = (obj.data.content as any).fields;
            const gameId = gameIdsForTier[index];

            // Parse status - handle both number and string
            const status = typeof fields.status === 'string' ? parseInt(fields.status) : fields.status;

            // Parse players array
            const players = Array.isArray(fields.players) ? fields.players : [];

            return {
              gameId,
              tier,
              status,
              playerCount: players.length,
              maxPlayers: 50,
              prizePool: fields.prize_pool?.toString() || '0',
              creator: players[0] || '',
              players: players,
            };
          })
          .filter((game): game is GameInfo => game !== null);

        console.log(`📈 [Discover] Final result: ${validGames.length} games (${validGames.filter(g => g.status === GameStatus.WAITING).length} waiting, ${validGames.filter(g => g.status === GameStatus.ACTIVE).length} active)`);

        setGames(validGames);
      } catch (error) {
        console.error('❌ [Discover] Error fetching games:', error);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();

    // Refresh every 50 seconds
    const interval = setInterval(fetchGames, 50000);
    return () => clearInterval(interval);
  }, [tier, client]);

  // Create new game
  const handleCreateGame = async () => {
    if (!currentAccount?.address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setCreating(true);

      const entryFee = TIER_FEES[tier];
      const entryFeeOCT = entryFee / 1_000_000_000;

      // Get user's coins
      const coins = await client.getAllCoins({ owner: currentAccount.address });

      if (!coins.data || coins.data.length === 0) {
        alert('No coins found in wallet. Please get some OCT tokens first.');
        return;
      }

      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + parseInt(coin.balance), 0);

      if (totalBalance < entryFee) {
        alert(`Insufficient balance. You have ${(totalBalance / 1_000_000_000).toFixed(4)} OCT, need ${entryFeeOCT.toFixed(tier === 1 ? 2 : 0)} OCT`);
        return;
      }

      // Find a coin with enough balance, or use the largest one
      let paymentCoin = coins.data.find(coin => parseInt(coin.balance) >= entryFee);

      if (!paymentCoin) {
        // If no single coin has enough, use the largest one
        paymentCoin = coins.data.reduce((largest, coin) =>
          parseInt(coin.balance) > parseInt(largest.balance) ? coin : largest
        );

        console.warn('No single coin has enough balance. Using largest coin:', paymentCoin.balance);
        alert(`Warning: Your largest coin has ${(parseInt(paymentCoin.balance) / 1_000_000_000).toFixed(4)} OCT. You may need to merge coins first. Attempting anyway...`);
      }

      console.log('Creating game in tier:', tier);

      await createGame(tier);

      alert('Game created successfully!');

      // Refresh games list
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game: ' + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const tierColors = {
    1: '#10b981',
    2: '#3b82f6',
    3: '#8b5cf6',
    4: '#f59e0b',
    5: '#ef4444',
  };

  const tierColor = tierColors[tier] || '#10b981';
  const waitingGames = games.filter(g => g.status === GameStatus.WAITING);
  const activeGames = games.filter(g => g.status === GameStatus.ACTIVE);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#9ca3af',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            textDecoration: 'none'
          }}
        >
          ← Back to Home
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              {TIER_NAMES[tier]} Tier
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
              Entry Fee: <span style={{ color: tierColor, fontWeight: 'bold' }}>
                {(TIER_FEES[tier] / 1_000_000_000).toFixed(tier === 1 ? 2 : 0)} OCT
              </span>
            </p>
          </div>

          <button
            onClick={handleCreateGame}
            disabled={creating || !currentAccount}
            style={{
              padding: '1rem 2rem',
              backgroundColor: creating || !currentAccount ? '#4b5563' : tierColor,
              color: creating || !currentAccount ? '#9ca3af' : 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: creating || !currentAccount ? 'not-allowed' : 'pointer',
              boxShadow: `0 10px 15px -3px ${tierColor}30`,
              transition: 'all 0.2s'
            }}
          >
            {creating ? 'Creating...' : !currentAccount ? 'Connect Wallet' : '+ Create New Game'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⟳</div>
          <p>Loading games...</p>
        </div>
      )}

      {/* Waiting Games */}
      {!loading && waitingGames.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: tierColor,
              borderRadius: '50%',
              display: 'inline-block'
            }} />
            Waiting for Players ({waitingGames.length})
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {waitingGames.map((game) => (
              <GameCard key={game.gameId} game={game} tierColor={tierColor} />
            ))}
          </div>
        </section>
      )}

      {/* Active Games */}
      {!loading && activeGames.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#f59e0b',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            Active Games ({activeGames.length})
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {activeGames.map((game) => (
              <GameCard key={game.gameId} game={game} tierColor={tierColor} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && games.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '6rem 2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            No games available
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            Be the first to create a game in this tier!
          </p>
          {currentAccount && (
            <button
              onClick={handleCreateGame}
              disabled={creating}
              style={{
                padding: '1rem 2rem',
                backgroundColor: tierColor,
                color: 'black',
                fontWeight: 'bold',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 10px 15px -3px ${tierColor}30`
              }}
            >
              {creating ? 'Creating...' : 'Create Game'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, tierColor }: { game: GameInfo; tierColor: string }) {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { joinGame } = useGameActionsWithSponsor();
  const [joining, setJoining] = useState(false);

  const isWaiting = game.status === GameStatus.WAITING;
  const prizePoolOCT = (parseInt(game.prizePool) / 1_000_000_000).toFixed(2);

  // Check if current user is already in this game
  const isPlayerInGame = currentAccount?.address
    ? game.players.includes(currentAccount.address)
    : false;

  const handleJoinGame = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (!currentAccount?.address) {
      alert('Please connect your wallet first');
      return;
    }

    // If user is already in the game, go to lobby/game page
    if (isPlayerInGame) {
      if (isWaiting) {
        router.push(`/game/${game.gameId}/lobby`);
      } else {
        router.push(`/game/${game.gameId}`);
      }
      return;
    }

    // If game is already active and user not in it, just view it
    if (!isWaiting) {
      router.push(`/game/${game.gameId}`);
      return;
    }

    // For waiting games, join first then redirect to lobby
    try {
      setJoining(true);

      await joinGame(game.tier as Tier, game.gameId);

      alert('Successfully joined the game!');

      // Redirect to lobby
      router.push(`/game/${game.gameId}/lobby`);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game: ' + (error as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      onClick={handleJoinGame}
      style={{
        display: 'block',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.75rem',
        cursor: joining ? 'wait' : 'pointer',
        position: 'relative',
        border: `1px solid ${tierColor}30`,
        padding: '1.5rem',
        textDecoration: 'none',
        transition: 'all 0.2s'
      }}
    >
      {/* Status Badge */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          backgroundColor: isWaiting ? `${tierColor}20` : 'rgba(245, 158, 11, 0.2)',
          color: isWaiting ? tierColor : '#f59e0b',
          fontSize: '0.75rem',
          fontWeight: '600',
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {isWaiting ? 'Waiting' : 'Active'}
        </span>
      </div>

      {/* Game Info */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem'
        }}>
          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Players</span>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.125rem' }}>
            {game.playerCount}/{game.maxPlayers}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Prize Pool</span>
          <span style={{ color: tierColor, fontWeight: 'bold', fontSize: '1.125rem' }}>
            {prizePoolOCT} OCT
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '9999px',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: `${(game.playerCount / game.maxPlayers) * 100}%`,
          height: '100%',
          backgroundColor: tierColor,
          transition: 'width 0.3s'
        }} />
      </div>

      {/* Action */}
      <div style={{
        color: tierColor,
        fontSize: '0.875rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          {joining
            ? 'Joining...'
            : isPlayerInGame
            ? isWaiting
              ? 'Continue to Lobby'
              : 'View Game'
            : isWaiting
            ? 'Join Game'
            : 'View Game'}
        </span>
        <span>{joining ? '⏳' : '→'}</span>
      </div>
    </div>
  );
}

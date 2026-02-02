'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useGameState } from '@/hooks/useGameState';
import { useGameActionsWithSponsor } from '@/hooks/useGameActionsWithSponsor';
import { useGameChat } from '@/hooks/useGameChat';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { GameSchedule } from '@/components/game/GameSchedule';
import { TIER_NAMES, TIER_FEES, GameStatus, MAX_PLAYERS_PER_GAME, TOKEN_SYMBOL } from '@/lib/constants';
import Link from 'next/link';

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const currentAccount = useCurrentAccount();

  const { gameState, loading, error, isPlayerInGame, refetch } = useGameState(gameId);
  const { joinGame, startGame } = useGameActionsWithSponsor();

  // Game chat
  const {
    messages,
    loading: chatLoading,
    error: chatError,
    sending,
    sendMessage,
  } = useGameChat(gameId, currentAccount?.address);

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Redirect to game page when game starts
  useEffect(() => {
    if (gameState?.status === GameStatus.ACTIVE) {
      console.log('🎮 Game has started! Redirecting to game page...');
      router.push(`/game/${gameId}`);
    }
  }, [gameState?.status, gameId, router]);

  // Redirect if game is finished or cancelled
  useEffect(() => {
    if (gameState?.status === GameStatus.FINISHED || gameState?.status === GameStatus.CANCELLED) {
      console.log('Game has ended. Redirecting to discover page...');
      router.push(`/discover/${gameState.tier}`);
    }
  }, [gameState?.status, gameState?.tier, router]);

  // Handle join game
  const handleJoinGame = async () => {
    if (!currentAccount?.address || !gameState) return;

    try {
      setJoining(true);

      await joinGame(gameState.tier, gameId);

      // Refresh game state
      await refetch();

      alert('Successfully joined the game!');
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game: ' + (error as Error).message);
    } finally {
      setJoining(false);
    }
  };

  // Handle start game (need at least 3 players)
  const handleStartGame = async () => {
    if (!currentAccount?.address || !gameState) return;

    if (gameState.players.length < 3) {
      alert('Need at least 3 players to start the game!');
      return;
    }

    try {
      setStarting(true);

      await startGame(gameId);

      alert('Game started successfully!');

      // The useEffect will redirect to the game page
      await refetch();
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game: ' + (error as Error).message);
    } finally {
      setStarting(false);
    }
  };

  // Handle leave lobby (only before game starts)
  const handleLeaveGame = async () => {
    if (!currentAccount?.address || !gameState) return;

    if (gameState.status !== GameStatus.WAITING) {
      alert('Cannot leave - game has already started!');
      return;
    }

    try {
      setLeaving(true);

      // TODO: Implement leave_game function in smart contract
      // For now, just redirect back
      alert('Leave game functionality coming soon. For now, you can close this tab.');

      router.push(`/discover/${gameState.tier}`);
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Failed to leave game: ' + (error as Error).message);
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: '#9ca3af' }}>Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Game Not Found</h2>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>{error || 'Could not load game'}</p>
          <Link
            href="/discover/1"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const isInGame = isPlayerInGame();
  const canJoin = !isInGame && gameState.players.length < MAX_PLAYERS_PER_GAME;
  const entryFee = TIER_FEES[gameState.tier as keyof typeof TIER_FEES];
  const entryFeeTokens = entryFee / 1_000_000_000;
  const prizePoolTokens = (parseInt(gameState.prizePool) / 1_000_000_000).toFixed(2);

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
            Game Lobby
          </h1>
          <Link
            href={`/discover/${gameState.tier}`}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Back
          </Link>
        </div>

        {/* Game Info Card */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Tier
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                {TIER_NAMES[gameState.tier as keyof typeof TIER_NAMES]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Entry Fee
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                {entryFeeTokens.toFixed(gameState.tier === 1 ? 2 : 0)} {TOKEN_SYMBOL}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Prize Pool
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {prizePoolTokens} {TOKEN_SYMBOL}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Players
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                {gameState.players.length} / {MAX_PLAYERS_PER_GAME}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div style={{
        backgroundColor: gameState.status === GameStatus.WAITING ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        border: `1px solid ${gameState.status === GameStatus.WAITING ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          {gameState.status === GameStatus.WAITING ? '⏳' : '🎮'}
        </div>
        <p style={{ color: 'white', fontWeight: '600' }}>
          {gameState.status === GameStatus.WAITING
            ? gameState.players.length >= 3
              ? 'Ready to start! Any player can begin the game.'
              : 'Waiting for players to join...'
            : 'Game starting soon!'}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {gameState.status === GameStatus.WAITING
            ? gameState.players.length >= 3
              ? `${gameState.players.length} players ready • Click "Start Game" to begin`
              : `Need at least 3 players to start (${gameState.players.length}/3)`
            : `Get ready!`}
        </p>
      </div>

      {/* Players List */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
          Players ({gameState.players.length})
        </h2>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {gameState.players.map((player, index) => (
            <div
              key={player.address}
              style={{
                backgroundColor: player.address === currentAccount?.address
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: player.address === currentAccount?.address
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '0.5rem',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: index === 0 ? '#f59e0b' : '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                {index === 0 ? '👑' : '🎮'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'white' }}>
                  {player.address.slice(0, 6)}...{player.address.slice(-4)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {index === 0 ? 'Creator' : 'Player'}
                  {player.address === currentAccount?.address && ' (You)'}
                </div>
              </div>
              <div style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                Ready
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {gameState.players.length < MAX_PLAYERS_PER_GAME && (
            <div style={{
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              padding: '1rem',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              Waiting for more players...
            </div>
          )}
        </div>
      </div>

      {/* Game Schedule */}
      <GameSchedule
        gameId={gameId}
        playerAddress={currentAccount?.address}
        playerCount={gameState.players.length}
      />

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
        {!currentAccount && (
          <div style={{
            padding: '1rem 2rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            color: '#ef4444',
            textAlign: 'center'
          }}>
            Please connect your wallet to join
          </div>
        )}

        {currentAccount && canJoin && (
          <button
            onClick={handleJoinGame}
            disabled={joining}
            style={{
              padding: '1rem 2rem',
              backgroundColor: joining ? '#6b7280' : '#10b981',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: joining ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            {joining ? 'Joining...' : `Join Game (${entryFeeTokens.toFixed(gameState.tier === 1 ? 2 : 0)} ${TOKEN_SYMBOL})`}
          </button>
        )}

        {currentAccount && isInGame && gameState.status === GameStatus.WAITING && gameState.players.length >= 3 && (
          <button
            onClick={handleStartGame}
            disabled={starting}
            style={{
              padding: '1rem 2rem',
              backgroundColor: starting ? '#6b7280' : '#6366f1',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: starting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
            }}
          >
            {starting ? 'Starting...' : '🚀 Start Game'}
          </button>
        )}

        {currentAccount && isInGame && gameState.status === GameStatus.WAITING && (
          <button
            onClick={handleLeaveGame}
            disabled={leaving}
            style={{
              padding: '1rem 2rem',
              backgroundColor: leaving ? '#6b7280' : 'rgba(239, 68, 68, 0.1)',
              color: leaving ? 'white' : '#ef4444',
              fontWeight: '600',
              borderRadius: '0.5rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: leaving ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            {leaving ? 'Leaving...' : 'Leave Lobby'}
          </button>
        )}
      </div>

      {/* Game Rules */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
          📋 How to Play
        </h3>
        <ul style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
          <li>Each round has two phases: Question and Answer</li>
          <li>Vote with the majority to survive - minority players are eliminated</li>
          <li>Saboteurs try to disrupt consensus without being detected</li>
          <li>Survive 3 rounds to split the prize pool with other winners</li>
          <li>Gas fees are sponsored - play for free!</li>
        </ul>
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        messages={messages}
        currentPlayerAddress={currentAccount?.address}
        onSendMessage={sendMessage}
        sending={sending}
        loading={chatLoading}
        error={chatError}
        title="Lobby Chat"
        placeholder="Chat with other players..."
      />
    </div>
  );
}

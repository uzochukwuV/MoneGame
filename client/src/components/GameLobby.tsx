import { useState, useEffect, useCallback } from 'react';
import { Tier, TIER_NAMES, TIER_FEES, GameStatus } from '../types/game';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useGameActions } from '../hooks/useGameActions';

interface GameLobbyProps {
  tier: Tier;
  gameId: string;
  packageId: string;
  onLeave: () => void;
  onGameStart: (gameData: any) => void;
}

export function GameLobby({ tier, gameId, packageId, onLeave, onGameStart }: GameLobbyProps) {
  const minPlayers = 10;
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const gameActions = useGameActions({ packageId });

  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Poll for game updates
  useEffect(() => {
    console.log('🎮 [GameLobby] Starting lobby polling for game:', gameId.slice(0, 8) + '...');

    const pollGame = async () => {
      try {
        // Fetch fresh game data from blockchain
        const gameObject = await suiClient.getObject({
          id: gameId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (!gameObject.data || !gameObject.data.content || gameObject.data.content.dataType !== 'moveObject') {
          return;
        }

        const fields = gameObject.data.content.fields as any;

        // Extract fields using same pattern as useGameActions.getGameInfo
        const newPlayerCount = (fields.players || []).length;
        const eliminatedCount = (fields.eliminated || []).length;
        const gameStatus = fields.status || GameStatus.WAITING;
        const currentRound = fields.current_round || 0;
        const prizePool = fields.prize_pool || '0';
        const currentQuestioner = fields.current_questioner || '';
        const question = fields.question ? {
          text: fields.question.text || '',
          optionA: fields.question.option_a || '',
          optionB: fields.question.option_b || '',
          optionC: fields.question.option_c || '',
        } : null;

        console.log('📊 [GameLobby] Poll - Players:', newPlayerCount, 'Status:', gameStatus, 'Eliminated:', eliminatedCount);

        // Update player count
        setPlayerCount(newPlayerCount);

        // If game has started (status changed to ACTIVE or 10+ players), notify parent ONLY ONCE
        if (!gameStarted && (newPlayerCount >= minPlayers || gameStatus === GameStatus.ACTIVE)) {
          console.log('✅ [GameLobby] Game starting! Notifying parent...');
          console.log('   - Players:', newPlayerCount);
          console.log('   - Status:', gameStatus);
          console.log('   - Eliminated:', eliminatedCount);

          // Mark as started to prevent multiple calls
          setGameStarted(true);

          // Pass full game data to parent using same structure as useGameActions
          onGameStart({
            status: gameStatus,
            currentRound,
            playerCount: newPlayerCount,
            eliminatedCount,
            prizePool,
            currentQuestioner,
            question,
          });
        }
      } catch (error) {
        console.error('❌ [GameLobby] Error polling game:', error);
      }
    };

    // Poll immediately, then every 2 seconds
    pollGame();
    const interval = setInterval(pollGame, 200000);

    return () => {
      clearInterval(interval);
    };
  }, [gameId, suiClient, packageId, onGameStart, gameStarted]);

  // Handle manual game start
  const handleStartGame = useCallback(async () => {
    if (!currentAccount || !gameActions || playerCount < minPlayers) return;

    setIsStarting(true);
    console.log('🎮 [GameLobby] Starting game manually...');

    try {
      // Call blockchain startGame function
      const txDigest = await gameActions.startGame(gameId);
      console.log('✅ [GameLobby] Game start transaction sent:', txDigest);

      // Fetch updated game data to confirm status change
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for indexing

      const gameObject = await suiClient.getObject({
        id: gameId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (gameObject.data?.content && gameObject.data.content.dataType === 'moveObject') {
        const fields = gameObject.data.content.fields as any;
        const newPlayerCount = (fields.players || []).length;
        const eliminatedCount = (fields.eliminated || []).length;
        const gameStatus = fields.status || GameStatus.WAITING;
        const currentRound = fields.current_round || 0;

        console.log('✅ [GameLobby] Game started! Status updated on blockchain');
        console.log('   - Players:', newPlayerCount);
        console.log('   - Status:', gameStatus);

        // Notify parent with updated game data
        onGameStart({
          status: gameStatus,
          currentRound,
          playerCount: newPlayerCount,
          eliminatedCount,
          prizePool: fields.prize_pool || '0',
          currentQuestioner: fields.current_questioner || '',
          question: fields.question || null,
        });
      }
    } catch (error) {
      console.error('❌ [GameLobby] Error starting game:', error);
    } finally {
      setIsStarting(false);
    }
  }, [currentAccount, gameActions, playerCount, gameId, suiClient, onGameStart]);

  const progress = Math.min((playerCount / minPlayers) * 100, 100);

  return (
    <div className="game-container">
      <div className="game-card">
        <div className="lobby-container">
          <div className="lobby-icon">&#x1F3AE;</div>
          <h2 className="lobby-title">Waiting for Players</h2>
          <p className="lobby-subtitle">
            {TIER_NAMES[tier]} Arena - {TIER_FEES[tier]} OCT Entry
          </p>

          <div className="lobby-players">
            <div className="lobby-stat">
              <div className="lobby-stat-value">{playerCount}</div>
              <div className="lobby-stat-label">Players Joined</div>
            </div>
            <div className="lobby-stat">
              <div className="lobby-stat-value">{minPlayers}</div>
              <div className="lobby-stat-label">Min to Start</div>
            </div>
          </div>

          <div style={{ 
            width: '100%', 
            maxWidth: '400px', 
            margin: '0 auto 2rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '8px',
              background: 'var(--gradient-primary)',
              transition: 'width 0.5s ease'
            }} />
          </div>

          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {playerCount >= minPlayers 
              ? 'Game starting soon...' 
              : `Waiting for ${minPlayers - playerCount} more players...`}
          </p>

          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>

          {playerCount >= minPlayers && (
            <button
              className="submit-button"
              onClick={handleStartGame}
              disabled={isStarting}
              style={{ marginBottom: '1rem', width: '100%' }}
            >
              {isStarting ? '⟳ Starting Game...' : '🚀 Start Game'}
            </button>
          )}

          <button className="back-button" onClick={onLeave}>
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

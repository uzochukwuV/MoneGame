import { useState, useEffect, useCallback } from 'react';
import { Tier, TIER_NAMES, TIER_FEES, GameStatus } from '../types/game';
import { useSuiClient } from '@mysten/dapp-kit';

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
  const [playerCount, setPlayerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

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
        setIsLoading(false);

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
    const interval = setInterval(pollGame, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [gameId, suiClient, packageId, onGameStart, gameStarted]);

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

          <button className="back-button" onClick={onLeave}>
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

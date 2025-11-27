import { Tier, TIER_NAMES, TIER_FEES } from '../types/game';

interface GameLobbyProps {
  tier: Tier;
  playerCount: number;
  onLeave: () => void;
}

export function GameLobby({ tier, playerCount, onLeave }: GameLobbyProps) {
  const minPlayers = 10;
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

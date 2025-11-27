/**
 * GameDiscovery Component
 *
 * Displays available games for a specific tier
 * Users can:
 * - Browse waiting games
 * - Join an existing game
 * - Create a new game if none available
 *
 * TESTING: Uses console.log for integrated debugging
 */

import { useState, useEffect, useMemo } from 'react';
import { Tier, GameStatus, TIER_NAMES, TIER_FEES } from '../types/game';
import { useGameDiscovery } from '../hooks/useGameDiscovery';
import type { AvailableGame, GameSortBy } from '../types/discovery';
import '../styles/game-discovery.css';

interface GameDiscoveryProps {
  tier: Tier;
  onSelectGame: (gameId: string) => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

export function GameDiscovery({
  tier,
  onSelectGame,
  onCreateNew,
  onCancel,
}: GameDiscoveryProps) {
  // Test: Log component mount
  useEffect(() => {
    console.log('🎯 GameDiscovery Component Mounted');
    console.log('📋 Tier:', tier, `(${TIER_NAMES[tier]})`);
    console.log('💰 Entry Fee:', TIER_FEES[tier], 'OCT');
  }, [tier]);

  // Hooks
  const { games, isLoading, error, getGamesByTier, filterGames } =
    useGameDiscovery();

  // State
  const [sortBy, setSortBy] = useState<GameSortBy>('players');
  const [minPlayerFilter, setMinPlayerFilter] = useState(0);

  // Test: Log when games change
  useEffect(() => {
    console.log('📊 All games in discovery:', games.length);
    games.forEach((game, index) => {
      console.log(`  Game ${index}:`, {
        id: game.gameId.slice(0, 8) + '...',
        tier: game.tier,
        players: game.playerCount,
        status: game.status,
      });
    });
  }, [games]);

  // Get games for this tier with filters
  const tierGames = useMemo(() => {
    const filtered = getGamesByTier(tier);
    console.log('🎲 Games for tier', tier, ':', filtered.length);
    return filtered;
  }, [tier, getGamesByTier]);

  // Apply additional filters and sorting
  const filteredAndSorted = useMemo(() => {
    let result = tierGames.filter(game => game.playerCount >= minPlayerFilter);

    // Test: Log filtering
    if (minPlayerFilter > 0) {
      console.log(
        `🔎 Filtered by min players (${minPlayerFilter}):`,
        result.length
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'players':
        result.sort((a, b) => b.playerCount - a.playerCount);
        console.log('📊 Sorted by: most players first');
        break;
      case 'prize':
        result.sort((a, b) => Number(b.prizePool) - Number(a.prizePool));
        console.log('💎 Sorted by: highest prize first');
        break;
      case 'newest':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        console.log('⏱️ Sorted by: newest first');
        break;
      case 'tier':
        // Already filtered by tier, but keep consistency
        console.log('🎯 Sorted by: tier (single tier view)');
        break;
    }

    console.log(
      `📈 Final display count: ${result.length} (sort: ${sortBy})`
    );
    return result;
  }, [tierGames, sortBy, minPlayerFilter]);

  // Handlers
  const handleJoinGame = (game: AvailableGame) => {
    console.log('➡️ Joining game:', {
      gameId: game.gameId,
      tier: game.tier,
      players: game.playerCount,
      entryFee: game.entryFee,
    });
    onSelectGame(game.gameId);
  };

  const handleCreateNew = () => {
    console.log('🆕 Creating new game for tier:', tier, `(${TIER_NAMES[tier]})`);
    onCreateNew();
  };

  const handleCancel = () => {
    console.log('❌ Cancelled game discovery, returning home');
    onCancel();
  };

  const handleSortChange = (newSort: GameSortBy) => {
    console.log('🔄 Changing sort from', sortBy, 'to', newSort);
    setSortBy(newSort);
  };

  // Test: Log error if present
  useEffect(() => {
    if (error) {
      console.error('⚠️ Discovery Error:', error);
    }
  }, [error]);

  return (
    <div className="game-discovery-container">
      {/* Header */}
      <div className="discovery-header">
        <button className="btn-back" onClick={handleCancel}>
          ← Back
        </button>
        <div className="header-content">
          <h2>Games Waiting for Players</h2>
          <p className="tier-info">
            {TIER_NAMES[tier]} Tier • {TIER_FEES[tier]} OCT entry fee
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="discovery-controls">
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={e => handleSortChange(e.target.value as GameSortBy)}
          >
            <option value="players">Most Players</option>
            <option value="prize">Highest Prize</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <div className="filter-controls">
          <label htmlFor="player-filter">Min Players:</label>
          <input
            id="player-filter"
            type="range"
            min="0"
            max="50"
            value={minPlayerFilter}
            onChange={e => {
              const value = Number(e.target.value);
              console.log('🔢 Filter min players:', value);
              setMinPlayerFilter(value);
            }}
          />
          <span className="filter-value">{minPlayerFilter}</span>
        </div>

        <button
          className="btn-refresh"
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>❌ Error: {error}</p>
          <p className="error-hint">
            Check console for details. Make sure Package ID is configured.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!error && filteredAndSorted.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
          <h3>No games waiting</h3>
          <p>
            {isLoading ? (
              <>
                <span className="loading-spinner">⟳</span> Fetching games...
              </>
            ) : tierGames.length === 0 ? (
              `No ${TIER_NAMES[tier]} games in progress. Create one to start!`
            ) : (
              'No games match your filters. Try adjusting them.'
            )}
          </p>
          {!isLoading && (
            <button className="btn-primary" onClick={handleCreateNew}>
              Create New Game
            </button>
          )}
        </div>
      )}

      {/* Games List */}
      {!error && filteredAndSorted.length > 0 && (
        <div className="games-list">
          <div className="games-count">
            {isLoading && <span className="loading-spinner">⟳</span>}
            Found {filteredAndSorted.length} waiting game
            {filteredAndSorted.length !== 1 ? 's' : ''}
          </div>

          {filteredAndSorted.map(game => (
            <GameCard
              key={game.gameId}
              game={game}
              onJoin={() => handleJoinGame(game)}
            />
          ))}
        </div>
      )}

      {/* Create New Section */}
      {!isLoading && !error && filteredAndSorted.length > 0 && (
        <div className="create-new-section">
          <div className="divider">Or</div>
          <button className="btn-secondary" onClick={handleCreateNew}>
            Create New Game Instead
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * GameCard Component
 * Displays a single game's info
 */
interface GameCardProps {
  game: AvailableGame;
  onJoin: () => void;
}

function GameCard({ game, onJoin }: GameCardProps) {
  const spaceLeft = game.maxPlayers - game.playerCount;
  const prizePoolOCT = Number(game.prizePool) / 1_000_000_000; // Convert MIST to OCT
  const entryFeeOCT = Number(game.entryFee) / 1_000_000_000;

  // Test: Log card render
  useEffect(() => {
    console.log('🎴 GameCard rendered:', {
      gameId: game.gameId.slice(0, 8) + '...',
      players: game.playerCount,
      prizePool: prizePoolOCT,
    });
  }, [game, prizePoolOCT]);

  return (
    <div className="game-card">
      <div className="game-card-header">
        <div className="game-id">Game #{game.gameId.slice(0, 8).toUpperCase()}</div>
        <div className="game-status">
          {game.playerCount >= 10 ? (
            <span className="status-ready">✓ Ready to Start</span>
          ) : (
            <span className="status-waiting">⏳ Waiting for Players</span>
          )}
        </div>
      </div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-label">Players</div>
          <div className="stat-value">
            {game.playerCount} / {game.maxPlayers}
            <span className="stat-hint">({spaceLeft} slots)</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(game.playerCount / game.maxPlayers) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Prize Pool</div>
          <div className="stat-value">{prizePoolOCT.toFixed(2)} OCT</div>
          <div className="stat-hint">
            Avg: {(prizePoolOCT / Math.max(game.playerCount, 1)).toFixed(2)} OCT per player
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Entry Fee</div>
          <div className="stat-value">{entryFeeOCT.toFixed(2)} OCT</div>
        </div>

        <div className="stat">
          <div className="stat-label">Round</div>
          <div className="stat-value">{game.currentRound} / 3</div>
        </div>
      </div>

      <button className="btn-join" onClick={onJoin}>
        Join Game
      </button>
    </div>
  );
}

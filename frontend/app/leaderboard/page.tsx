'use client';

import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GAME_PACKAGE_ID } from '@/lib/constants';

interface LeaderboardEntry {
  player: string;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  level: number;
  winRate: number;
  citizenWins: number;
  saboteurWins: number;
  badgeId: string;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
  5: 'Diamond',
};

const LEVEL_COLORS: Record<number, string> = {
  1: '#cd7f32',
  2: '#c0c0c0',
  3: '#ffd700',
  4: '#00d4ff',
  5: '#b9f2ff',
};

export default function LeaderboardPage() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'points' | 'wins' | 'winRate'>('points');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);

        // Query BadgeMinted events to find all players with badges
        const badgeMintedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${GAME_PACKAGE_ID}::reputation::BadgeMinted`,
          } as any,
          limit: 100,
          order: 'descending',
        });

        console.log('Found', badgeMintedEvents.data.length, 'BadgeMinted events');

        const entries: LeaderboardEntry[] = [];

        for (const event of badgeMintedEvents.data) {
          const data = event.parsedJson as any;
          const badgeId = data?.badge_id;
          const player = data?.player;

          if (!badgeId || !player) continue;

          try {
            // Fetch the badge object to get current stats
            const badgeObject = await client.getObject({
              id: badgeId,
              options: { showContent: true },
            });

            if (badgeObject.data?.content && 'fields' in badgeObject.data.content) {
              const fields = badgeObject.data.content.fields as any;

              const gamesPlayed = parseInt(fields.games_played || '0');
              const gamesWon = parseInt(fields.games_won || '0');
              const totalPoints = parseInt(fields.total_points || '0');
              const level = parseInt(fields.level || '1');
              const citizenWins = parseInt(fields.citizen_wins || '0');
              const saboteurWins = parseInt(fields.saboteur_wins || '0');

              const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

              entries.push({
                player,
                gamesPlayed,
                gamesWon,
                totalPoints,
                level,
                winRate,
                citizenWins,
                saboteurWins,
                badgeId,
              });
            }
          } catch (error) {
            console.error('Error fetching badge', badgeId, error);
          }
        }

        setLeaderboard(entries);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [client]);

  // Sort leaderboard
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'points') return b.totalPoints - a.totalPoints;
    if (sortBy === 'wins') return b.gamesWon - a.gamesWon;
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    return 0;
  });

  // Find current user's rank
  const currentUserRank = currentAccount
    ? sortedLeaderboard.findIndex(e => e.player === currentAccount.address) + 1
    : 0;

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

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '0.5rem'
        }}>
          Leaderboard
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
          Top players ranked by reputation badges
        </p>
      </div>

      {/* Current User Rank */}
      {currentAccount && currentUserRank > 0 && (
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '0.75rem',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '2rem'
        }}>
          <div style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Your Rank
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>
            #{currentUserRank}
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setSortBy('points')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: sortBy === 'points' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
            color: sortBy === 'points' ? 'white' : '#9ca3af',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Total Points
        </button>
        <button
          onClick={() => setSortBy('wins')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: sortBy === 'wins' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
            color: sortBy === 'wins' ? 'white' : '#9ca3af',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Most Wins
        </button>
        <button
          onClick={() => setSortBy('winRate')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: sortBy === 'winRate' ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
            color: sortBy === 'winRate' ? 'white' : '#9ca3af',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Win Rate
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⟳</div>
          <p>Loading leaderboard...</p>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && sortedLeaderboard.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 120px 120px 120px 100px',
            gap: '1rem',
            padding: '1rem 1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <div>Rank</div>
            <div>Player</div>
            <div>Level</div>
            <div>Games</div>
            <div>Win Rate</div>
            <div>Points</div>
          </div>

          {/* Table Body */}
          {sortedLeaderboard.map((entry, index) => (
            <LeaderboardRow
              key={entry.badgeId}
              entry={entry}
              rank={index + 1}
              isCurrentUser={currentAccount?.address === entry.player}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedLeaderboard.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '6rem 2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            No Players Yet
          </h3>
          <p style={{ color: '#9ca3af' }}>
            Be the first to earn a reputation badge!
          </p>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const levelColor = LEVEL_COLORS[entry.level] || '#9ca3af';
  const levelName = LEVEL_NAMES[entry.level] || 'Unknown';

  const rankMedals: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 120px 120px 120px 100px',
      gap: '1rem',
      padding: '1rem 1.5rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      backgroundColor: isCurrentUser ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    }}>
      {/* Rank */}
      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
        {rankMedals[rank] || `#${rank}`}
      </div>

      {/* Player */}
      <div>
        <div style={{ color: 'white', fontSize: '0.875rem', fontFamily: 'monospace', marginBottom: '0.25rem' }}>
          {entry.player.slice(0, 8)}...{entry.player.slice(-6)}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          <span>👥 {entry.citizenWins}C</span>
          <span>🎭 {entry.saboteurWins}S</span>
        </div>
      </div>

      {/* Level */}
      <div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          backgroundColor: `${levelColor}20`,
          borderRadius: '9999px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: levelColor
          }} />
          <span style={{ color: levelColor, fontSize: '0.75rem', fontWeight: '600' }}>
            {levelName}
          </span>
        </div>
      </div>

      {/* Games */}
      <div>
        <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>
          {entry.gamesWon}/{entry.gamesPlayed}
        </div>
        <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
          wins/total
        </div>
      </div>

      {/* Win Rate */}
      <div>
        <div style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: '600' }}>
          {entry.winRate.toFixed(1)}%
        </div>
      </div>

      {/* Points */}
      <div>
        <div style={{ color: '#f59e0b', fontSize: '0.875rem', fontWeight: '600' }}>
          {entry.totalPoints}
        </div>
      </div>
    </div>
  );
}

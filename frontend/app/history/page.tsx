'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GAME_PACKAGE_ID, TIER_NAMES } from '@/lib/constants';

interface PlayerTicket {
  id: string;
  gameId: string;
  player: string;
  tier: number;
  points: number;
  endingRound: number;
  survived: boolean;
}

export default function HistoryPage() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  const [tickets, setTickets] = useState<PlayerTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    gamesWon: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentAccount?.address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch all PlayerTicket NFTs owned by the user
        const ownedObjects = await client.getOwnedObjects({
          owner: currentAccount.address,
          filter: {
            StructType: `${GAME_PACKAGE_ID}::battle_royale::PlayerTicket`,
          },
          options: {
            showContent: true,
          },
        });

        console.log('Found', ownedObjects.data.length, 'PlayerTicket NFTs');

        const ticketList: PlayerTicket[] = [];
        let totalGames = 0;
        let gamesWon = 0;
        let totalPoints = 0;

        for (const obj of ownedObjects.data) {
          if (obj.data?.content && 'fields' in obj.data.content) {
            const fields = obj.data.content.fields as any;

            const ticket: PlayerTicket = {
              id: obj.data.objectId,
              gameId: fields.game_id,
              player: fields.player,
              tier: parseInt(fields.tier),
              points: parseInt(fields.points || '0'),
              endingRound: parseInt(fields.ending_round || '0'),
              survived: fields.survived === true,
            };

            ticketList.push(ticket);
            totalGames++;
            if (ticket.survived) gamesWon++;
            totalPoints += ticket.points;
          }
        }

        // Sort by most recent (assuming higher ID = more recent)
        ticketList.sort((a, b) => b.id.localeCompare(a.id));

        setTickets(ticketList);
        setStats({
          totalGames,
          gamesWon,
          totalPoints,
        });
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentAccount, client]);

  const winRate = stats.totalGames > 0
    ? ((stats.gamesWon / stats.totalGames) * 100).toFixed(1)
    : '0.0';

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
          Game History
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
          Your PlayerTicket NFT collection and game statistics
        </p>
      </div>

      {/* Connection State */}
      {!currentAccount && (
        <div style={{
          textAlign: 'center',
          padding: '6rem 2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔌</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Connect Your Wallet
          </h3>
          <p style={{ color: '#9ca3af' }}>
            Connect your wallet to view your game history
          </p>
        </div>
      )}

      {/* Stats Overview */}
      {currentAccount && (
        <section style={{
          padding: '2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '3rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '0.5rem' }}>
                {stats.totalGames}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Games Played
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                {stats.gamesWon}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Games Won
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.5rem' }}>
                {winRate}%
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Win Rate
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '0.5rem' }}>
                {stats.totalPoints}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Points
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && currentAccount && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⟳</div>
          <p>Loading your game history...</p>
        </div>
      )}

      {/* Tickets List */}
      {!loading && currentAccount && tickets.length > 0 && (
        <section>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            PlayerTicket NFTs ({tickets.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && currentAccount && tickets.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '6rem 2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            No Games Played Yet
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            Start playing to build your history and earn PlayerTicket NFTs!
          </p>
          <Link
            href="/discover/1"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              backgroundColor: '#10b981',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
            }}
          >
            Start Playing
          </Link>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: PlayerTicket }) {
  const tierColors: Record<number, string> = {
    1: '#10b981',
    2: '#3b82f6',
    3: '#8b5cf6',
    4: '#f59e0b',
    5: '#ef4444',
  };

  const tierColor = tierColors[ticket.tier] || '#10b981';
  const tierName = TIER_NAMES[ticket.tier as 1 | 2 | 3 | 4 | 5] || `Tier ${ticket.tier}`;

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '0.75rem',
      border: `1px solid ${tierColor}30`,
      padding: '1.5rem',
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Left Side - Tier & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: `${tierColor}20`,
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: tierColor
          }}>
            {ticket.tier}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                {tierName}
              </h3>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                backgroundColor: ticket.survived ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: ticket.survived ? '#10b981' : '#ef4444',
                fontSize: '0.75rem',
                fontWeight: '600',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {ticket.survived ? 'Survived' : 'Eliminated'}
              </span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Round {ticket.endingRound} • {ticket.points} Points
            </p>
          </div>
        </div>

        {/* Right Side - Game ID */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            Game ID
          </div>
          <code style={{
            color: '#9ca3af',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem'
          }}>
            {ticket.gameId.slice(0, 8)}...{ticket.gameId.slice(-6)}
          </code>
        </div>
      </div>

      {/* NFT ID */}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          NFT ID
        </div>
        <code style={{
          color: '#9ca3af',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          {ticket.id}
        </code>
      </div>
    </div>
  );
}

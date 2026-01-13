'use client';

import { useState, useEffect } from 'react';
import { useGameSchedule } from '@/hooks/useGameSchedule';

interface GameScheduleProps {
  gameId: string;
  playerAddress?: string;
  playerCount: number;
}

export function GameSchedule({ gameId, playerAddress, playerCount }: GameScheduleProps) {
  const {
    schedules,
    loading,
    error,
    submitting,
    proposeTime,
    voteForTime,
    deleteProposal,
  } = useGameSchedule(gameId, playerAddress);

  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Set default to 1 hour from now
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);

    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
  }, []);

  const handleProposeTime = async () => {
    if (!selectedDate || !selectedTime) return;

    try {
      const proposedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      await proposeTime(proposedDateTime);
      setShowTimeSelector(false);
    } catch (err) {
      // Error handled by hook
    }
  };

  const formatTimeRemaining = (proposedTime: string) => {
    const now = new Date();
    const target = new Date(proposedTime);
    const diff = target.getTime() - now.getTime();

    if (diff < 0) return 'Time passed';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get top voted schedule
  const topSchedule = schedules.reduce((top, current) => {
    if (!top || current.votes.length > top.votes.length) return current;
    return top;
  }, null as typeof schedules[0] | null);

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '0.75rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '1.5rem',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', margin: 0, marginBottom: '0.25rem' }}>
            ⏰ Schedule Game Start
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
            Propose or vote for a start time
          </p>
        </div>

        {!showTimeSelector && playerAddress && (
          <button
            onClick={() => setShowTimeSelector(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            + Propose Time
          </button>
        )}
      </div>

      {/* Time Selector */}
      {showTimeSelector && playerAddress && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.375rem',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.375rem',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleProposeTime}
              disabled={submitting || !selectedDate || !selectedTime}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: submitting ? '#4b5563' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Proposing...' : 'Propose'}
            </button>
            <button
              onClick={() => setShowTimeSelector(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#9ca3af',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.5rem',
          color: '#ef4444',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Top Schedule Highlight */}
      {topSchedule && topSchedule.votes.length >= Math.ceil(playerCount / 2) && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🎯</span>
            <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.875rem' }}>
              Majority Agreed!
            </span>
          </div>
          <div style={{ color: 'white', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            {formatTime(topSchedule.proposed_time)}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {topSchedule.votes.length}/{playerCount} players ready • {formatTimeRemaining(topSchedule.proposed_time)} remaining
          </div>
        </div>
      )}

      {/* Schedule List */}
      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', padding: '1rem' }}>
          Loading schedules...
        </div>
      )}

      {!loading && schedules.length === 0 && (
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', padding: '2rem 1rem' }}>
          No proposed times yet. Be the first to suggest when to start!
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {schedules.map((schedule) => {
            const hasVoted = playerAddress && schedule.votes.includes(playerAddress);
            const isProposer = playerAddress && schedule.proposed_by === playerAddress;
            const isPast = new Date(schedule.proposed_time) < new Date();

            return (
              <div
                key={schedule.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: hasVoted
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '0.5rem',
                  opacity: isPast ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {formatTime(schedule.proposed_time)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {isPast ? 'Time passed' : formatTimeRemaining(schedule.proposed_time)} •{' '}
                      Proposed by {isProposer ? 'You' : `${schedule.proposed_by.slice(0, 6)}...${schedule.proposed_by.slice(-4)}`}
                    </div>
                  </div>

                  {isProposer && !isPast && (
                    <button
                      onClick={() => deleteProposal(schedule.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: hasVoted ? '#818cf8' : '#9ca3af' }}>
                      👍 {schedule.votes.length}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      ({Math.round((schedule.votes.length / playerCount) * 100)}%)
                    </span>
                  </div>

                  {playerAddress && !isPast && (
                    <button
                      onClick={() => voteForTime(schedule.id)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: hasVoted
                          ? 'rgba(99, 102, 241, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: hasVoted ? '#818cf8' : '#9ca3af',
                        border: hasVoted
                          ? '1px solid rgba(99, 102, 241, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {hasVoted ? '✓ Voted' : 'Vote'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

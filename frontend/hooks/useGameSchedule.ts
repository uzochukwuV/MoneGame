'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, Database } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type GameSchedule = Database['public']['Tables']['game_schedules']['Row'];

export function useGameSchedule(gameId: string, playerAddress?: string) {
  const [schedules, setSchedules] = useState<GameSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('game_schedules')
          .select('*')
          .eq('game_id', gameId)
          .order('proposed_time', { ascending: true });

        if (fetchError) throw fetchError;

        setSchedules(data || []);
      } catch (err) {
        console.error('Error fetching game schedules:', err);
        setError(err instanceof Error ? err.message : 'Failed to load schedules');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchSchedules();
    }
  }, [gameId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!gameId) return;

    const channel: RealtimeChannel = supabase
      .channel(`game_schedule:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_schedules',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSchedules((prev) => [...prev, payload.new as GameSchedule]);
          } else if (payload.eventType === 'UPDATE') {
            setSchedules((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as GameSchedule) : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setSchedules((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Propose a new time
  const proposeTime = useCallback(async (proposedTime: Date) => {
    if (!playerAddress || !gameId) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('game_schedules')
        .insert({
          game_id: gameId,
          proposed_time: proposedTime.toISOString(),
          proposed_by: playerAddress,
          votes: [playerAddress], // Auto-vote for own proposal
        });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Error proposing time:', err);
      setError(err instanceof Error ? err.message : 'Failed to propose time');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [gameId, playerAddress]);

  // Vote for a proposed time
  const voteForTime = useCallback(async (scheduleId: string) => {
    if (!playerAddress) {
      return;
    }

    try {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule) return;

      // Check if already voted
      if (schedule.votes.includes(playerAddress)) {
        // Remove vote
        const newVotes = schedule.votes.filter((v) => v !== playerAddress);
        const { error: updateError } = await supabase
          .from('game_schedules')
          .update({ votes: newVotes })
          .eq('id', scheduleId);

        if (updateError) throw updateError;
      } else {
        // Add vote
        const newVotes = [...schedule.votes, playerAddress];
        const { error: updateError } = await supabase
          .from('game_schedules')
          .update({ votes: newVotes })
          .eq('id', scheduleId);

        if (updateError) throw updateError;
      }
    } catch (err) {
      console.error('Error voting:', err);
      setError(err instanceof Error ? err.message : 'Failed to vote');
      throw err;
    }
  }, [schedules, playerAddress]);

  // Delete a proposed time (only proposer can delete)
  const deleteProposal = useCallback(async (scheduleId: string) => {
    if (!playerAddress) {
      return;
    }

    try {
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule || schedule.proposed_by !== playerAddress) {
        throw new Error('Only the proposer can delete this schedule');
      }

      const { error: deleteError } = await supabase
        .from('game_schedules')
        .delete()
        .eq('id', scheduleId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete proposal');
      throw err;
    }
  }, [schedules, playerAddress]);

  return {
    schedules,
    loading,
    error,
    submitting,
    proposeTime,
    voteForTime,
    deleteProposal,
  };
}

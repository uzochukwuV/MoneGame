'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, Database } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type GameChatMessage = Database['public']['Tables']['game_chats']['Row'];

export function useGameChat(gameId: string, playerAddress?: string) {
  const [messages, setMessages] = useState<GameChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('game_chats')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (fetchError) throw fetchError;

        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching game chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchMessages();
    }
  }, [gameId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!gameId) return;

    const channel: RealtimeChannel = supabase
      .channel(`game_chat:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_chats',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const newMessage = payload.new as GameChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!playerAddress || !gameId || !message.trim()) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('game_chats')
        .insert({
          game_id: gameId,
          player_address: playerAddress,
          message: message.trim(),
        });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  }, [gameId, playerAddress]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
  };
}

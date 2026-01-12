'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, Database } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type GlobalChatMessage = Database['public']['Tables']['global_chat']['Row'];

export function useGlobalChat(playerAddress?: string) {
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
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
          .from('global_chat')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);

        if (fetchError) throw fetchError;

        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching global chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('global_chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_chat',
        },
        (payload) => {
          const newMessage = payload.new as GlobalChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Send a message
  const sendMessage = useCallback(async (message: string) => {
    if (!playerAddress || !message.trim()) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('global_chat')
        .insert({
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
  }, [playerAddress]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
  };
}

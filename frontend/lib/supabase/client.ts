import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Chat features will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We don't need auth sessions for this use case
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit for real-time updates
    },
  },
});

export type Database = {
  public: {
    Tables: {
      game_chats: {
        Row: {
          id: string;
          game_id: string;
          player_address: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_address: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_address?: string;
          message?: string;
          created_at?: string;
        };
      };
      global_chat: {
        Row: {
          id: string;
          player_address: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_address: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_address?: string;
          message?: string;
          created_at?: string;
        };
      };
      game_schedules: {
        Row: {
          id: string;
          game_id: string;
          proposed_time: string;
          proposed_by: string;
          votes: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          proposed_time: string;
          proposed_by: string;
          votes?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          proposed_time?: string;
          proposed_by?: string;
          votes?: string[];
          created_at?: string;
        };
      };
    };
  };
};

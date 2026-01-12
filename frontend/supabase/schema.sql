-- Supabase Database Schema for Majority Rules Game
-- Run this SQL in your Supabase SQL Editor to set up the tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game Chats Table
-- Stores messages for specific games (only players in the game can see)
CREATE TABLE IF NOT EXISTS game_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  player_address TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_chats_game_id ON game_chats(game_id);
CREATE INDEX IF NOT EXISTS idx_game_chats_created_at ON game_chats(created_at DESC);

-- Global Chat Table
-- Stores messages visible to all players
CREATE TABLE IF NOT EXISTS global_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_address TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_global_chat_created_at ON global_chat(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE game_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_chats
-- Allow anyone to read all messages (we'll filter by game_id in the app)
CREATE POLICY "Anyone can read game chats" ON game_chats
  FOR SELECT USING (true);

-- Allow anyone to insert messages (we'll verify player address in the app)
CREATE POLICY "Anyone can insert game chats" ON game_chats
  FOR INSERT WITH CHECK (true);

-- RLS Policies for global_chat
-- Allow anyone to read global messages
CREATE POLICY "Anyone can read global chat" ON global_chat
  FOR SELECT USING (true);

-- Allow anyone to insert messages
CREATE POLICY "Anyone can insert global chat" ON global_chat
  FOR INSERT WITH CHECK (true);

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE global_chat;

-- Optional: Add a function to clean up old messages (older than 7 days)
CREATE OR REPLACE FUNCTION clean_old_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM game_chats WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM global_chat WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a cron job to run cleanup daily (requires pg_cron extension)
-- SELECT cron.schedule('clean-old-messages', '0 0 * * *', 'SELECT clean_old_messages()');

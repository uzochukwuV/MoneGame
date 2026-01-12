# Supabase Setup Guide for Majority Rules

This guide will help you set up Supabase for real-time chat functionality in the Majority Rules game.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Majority Rules (or any name you prefer)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
4. Click "Create new project" and wait for it to initialize (2-3 minutes)

## Step 2: Run the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor** (left sidebar)
2. Open the `schema.sql` file from this directory
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create:
- `game_chats` table - for game-specific chat messages
- `global_chat` table - for global lobby chat
- Indexes for better query performance
- Row Level Security (RLS) policies
- Real-time subscriptions

## Step 3: Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** > **API** (left sidebar)
2. Find these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1...` (long string)

## Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local` in your frontend directory:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update the Supabase values in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 5: Enable Realtime

1. In Supabase dashboard, go to **Database** > **Replication** (left sidebar)
2. Find the tables `game_chats` and `global_chat`
3. Toggle the switch to enable replication for both tables
4. Save changes

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app and navigate to a game
3. The chat box should appear
4. Try sending a message - it should appear in real-time!

## Optional: Configure Auto-Cleanup

To automatically delete messages older than 7 days:

1. Go to **Database** > **Extensions** in Supabase
2. Enable the `pg_cron` extension
3. Run this SQL in the SQL Editor:
   ```sql
   SELECT cron.schedule(
     'clean-old-messages',
     '0 0 * * *',
     'SELECT clean_old_messages()'
   );
   ```

This will run the cleanup function daily at midnight.

## Troubleshooting

### Messages not appearing in real-time

- Check that Realtime is enabled for both tables
- Verify your environment variables are correct
- Check browser console for errors
- Ensure Row Level Security policies are active

### "Failed to load messages" error

- Verify your Supabase URL and anon key are correct
- Check that the tables exist in your database
- Look at the Supabase logs in the dashboard

### Connection errors

- Make sure your Supabase project is active (not paused)
- Check your internet connection
- Verify the project URL is accessible

## Security Notes

- The `anon` key is safe to use in client-side code
- Row Level Security (RLS) is enabled for both tables
- Messages are automatically secured by player authentication
- Consider implementing rate limiting for message sends in production

## Next Steps

- Customize message retention period (default: 7 days)
- Add profanity filters or moderation
- Implement user blocking/reporting features
- Add message reactions or other social features

## Support

For Supabase-specific issues, visit:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)

For game-related issues, check the main README or open an issue on GitHub.

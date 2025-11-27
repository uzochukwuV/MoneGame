# Step-by-Step Integration Guide

## Overview

This guide walks you through integrating the blockchain hooks into your existing frontend, replacing mock data with real on-chain interactions.

## Architecture

```
User Action → useGameState → useGameActions → Blockchain
                ↓                                  ↓
            Local State ← Poll for Updates ← Events/Objects
                ↓
            Components
```

## Complete Hook System

### 1. **useGameActions** (Low-level blockchain operations)
- ✅ **Actions**: createGame, joinGame, askQuestion, submitAnswer, claimPrize
- ✅ **Getters**: getGameInfo, getPlayerStatus, getVotingResults, canClaimPrize
- ✅ **State**: isLoading, error

### 2. **useGameState** (High-level state management)
- ✅ Manages game phase (home → lobby → active → results)
- ✅ Auto-polls blockchain for updates
- ✅ Handles state transitions
- ✅ Provides simplified actions

### 3. **useGameData** (Real-time data fetching)
- ✅ Fetches and polls single game data
- ✅ Auto-updates every 5 seconds

## Integration Steps

### Step 1: Update Config (5 minutes)

```typescript
// src/config/game.ts
export const GAME_PACKAGE_ID = '0xYOUR_DEPLOYED_PACKAGE_ID';

export const TIER_ENTRY_FEES = {
  1: 100_000_000,   // 0.1 SUI
  2: 500_000_000,   // 0.5 SUI
  3: 1_000_000_000, // 1.0 SUI
} as const;
```

### Step 2: Replace App.tsx (15 minutes)

**Option A: Full replacement**
```bash
# Backup current App.tsx
cp src/App.tsx src/App.BACKUP.tsx

# Use integrated version
cp src/App.INTEGRATED.tsx src/App.tsx
```

**Option B: Manual integration**

1. Import the hook:
```typescript
import { useGameState } from './hooks/useGameState';
```

2. Replace state management:
```typescript
// OLD
const [gamePhase, setGamePhase] = useState<GamePhase>('home');
const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
// ... many more useState calls

// NEW
const { state, actions, isLoading, error } = useGameState();
```

3. Replace action handlers:
```typescript
// OLD
const handleSelectTier = useCallback((tier: Tier) => {
  setSelectedTier(tier);
  setGamePhase('lobby');
  // ... mock data
}, []);

// NEW
const handleSelectTier = async (tier: Tier) => {
  await actions.createGame(tier);
  // State automatically updates via polling
};
```

### Step 3: Update Component Props (10 minutes)

Components already match the required interface, just pass real data:

```typescript
// GameLobby
<GameLobby
  tier={state.tier}
  playerCount={state.playerCount}
  onLeave={actions.leaveGame}
/>

// ActiveGame
<ActiveGame
  gameInfo={{
    gameId: state.gameId || '',
    tier: state.tier || Tier.TIER_1,
    status: state.status,
    currentRound: state.currentRound,
    playerCount: state.playerCount,
    eliminatedCount: state.eliminatedCount,
    prizePool: parseInt(state.prizePool) || 0,
    currentQuestioner: state.currentQuestioner,
    questionAsked: !!state.question,
  }}
  question={state.question}
  isQuestioner={state.isQuestioner}
  hasAnswered={state.hasAnswered}
  playerAnswer={state.playerAnswer}
  timeRemaining={60000} // TODO: Calculate from blockchain
  answerCount={state.votingStats?.totalVotes || 0}
  votingStats={state.votingStats}
  onAskQuestion={handleAskQuestion}
  onSubmitAnswer={handleSubmitAnswer}
  onLeave={actions.leaveGame}
/>

// GameResults
<GameResults
  isWinner={!state.isEliminated}
  isEliminated={state.isEliminated}
  prizePool={parseInt(state.prizePool) || 0}
  survivors={state.survivors}
  canClaimPrize={state.canClaimPrize}
  onClaimPrize={handleClaimPrize}
  onPlayAgain={actions.leaveGame}
/>
```

### Step 4: Test Flow (30 minutes)

1. **Connect Wallet**
   - Click "Connect Wallet" in header
   - Select Sui Wallet
   - Approve connection

2. **Create Game**
   - Select a tier
   - Sign transaction
   - Wait for confirmation
   - Should auto-navigate to lobby

3. **Lobby Phase**
   - Should see real player count
   - Polls every 2 seconds
   - Auto-starts when min players reached

4. **Active Game**
   - If questioner: Submit question
   - If player: Wait for question, then answer
   - See real-time vote counts
   - Auto-advances rounds

5. **Results**
   - See if you won/lost
   - Claim prize if winner
   - Return to home

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Action                          │
│                    (Click "Join Game")                       │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      useGameState                            │
│  - Calls actions.createGame(tier)                           │
│  - Updates local state: phase = 'lobby'                     │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     useGameActions                           │
│  - Creates Transaction                                       │
│  - Calls signAndExecute()                                   │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      Blockchain                              │
│  - Transaction confirmed                                     │
│  - Game object created                                       │
│  - Events emitted                                            │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Polling (every 2s)                        │
│  - getGameInfo(gameId)                                      │
│  - Updates state.playerCount                                │
│  - Checks if status changed to ACTIVE                       │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Auto Phase Transition                      │
│  - Detects status === ACTIVE                                │
│  - Updates state.phase = 'active'                           │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Component Re-render                       │
│  - Shows ActiveGame component                               │
│  - Displays real blockchain data                            │
└─────────────────────────────────────────────────────────────┘
```

## Polling Strategy

### Lobby Phase
```typescript
Poll every 2 seconds:
- Player count
- Game status

Stop when:
- status === ACTIVE (game started)
- User leaves lobby
```

### Active Game Phase
```typescript
Poll every 3 seconds:
- Current question
- Answer count
- Voting results
- Round number

Stop when:
- status === FINISHED
- User leaves game
```

### Results Phase
```typescript
One-time fetch:
- Final results
- Prize amount
- Survivors list

No polling needed
```

## Error Handling

### Transaction Errors
```typescript
try {
  await actions.createGame(tier);
} catch (err) {
  if (err.message.includes('Insufficient funds')) {
    alert('You need more SUI to join this game');
  } else if (err.message.includes('User rejected')) {
    // User cancelled transaction
  } else {
    alert('Transaction failed. Please try again.');
  }
}
```

### Network Errors
```typescript
// Handled automatically by useGameActions
// Error state is exposed via error property
{error && <div className="error-banner">{error}</div>}
```

## Performance Optimization

### 1. Reduce Polling Frequency
```typescript
// In useGameState.ts
if (state.phase === 'lobby') {
  interval = setInterval(poll, 3000); // Increase from 2s to 3s
}
```

### 2. Stop Polling When Inactive
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Stop polling
    } else {
      // Resume polling
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### 3. Cache Game Data
```typescript
// Use React Query for caching
const { data: gameData } = useQuery({
  queryKey: ['game', gameId],
  queryFn: () => gameActions.getGameInfo(gameId),
  refetchInterval: 3000,
});
```

## Troubleshooting

### Issue: "Game not found"
- Check GAME_PACKAGE_ID is correct
- Verify game object ID is valid
- Ensure you're on the right network (testnet/mainnet)

### Issue: "Transaction failed"
- Check wallet has enough SUI for gas + entry fee
- Verify contract is deployed correctly
- Check browser console for detailed error

### Issue: "Polling not working"
- Check network connection
- Verify RPC endpoint is responsive
- Look for errors in browser console

### Issue: "State not updating"
- Ensure gameId is set correctly
- Check polling interval is running
- Verify blockchain data structure matches expected format

## Next Steps

1. ✅ Deploy your contract to testnet
2. ✅ Update GAME_PACKAGE_ID
3. ✅ Test with real wallet
4. ⏳ Add transaction notifications (toast messages)
5. ⏳ Add loading skeletons
6. ⏳ Implement game discovery (join existing games)
7. ⏳ Add leaderboard
8. ⏳ Deploy to production

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify contract deployment
3. Test with Sui Explorer
4. Review transaction history in wallet

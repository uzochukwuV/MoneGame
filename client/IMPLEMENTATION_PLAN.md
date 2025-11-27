# Complete Implementation Plan

## Current State Analysis

### Components Flow
1. **TierSelection** → User selects tier → Creates/Joins game
2. **GameLobby** → Waiting for players → Auto-start when min reached
3. **ActiveGame** → Question/Answer rounds → 3 rounds total
4. **GameResults** → Show winner/loser → Claim prize

### Data Flow Requirements

#### Phase 1: Tier Selection → Game Creation
- User clicks tier → Create game on blockchain
- Get game ID from transaction
- Navigate to lobby with game ID

#### Phase 2: Game Lobby
- Poll game state every 2-3 seconds
- Show real-time player count
- Auto-transition when game starts (status changes to ACTIVE)

#### Phase 3: Active Game
- **Round Start**: Determine questioner (rotate or random)
- **Question Phase**: 
  - If questioner: Submit question + answer
  - If player: Wait for question
- **Answer Phase**: All players submit answers
- **Results Phase**: Show voting stats, eliminate minority
- **Next Round**: Repeat or end game

#### Phase 4: Game Results
- Show final results
- If winner: Allow claim prize
- Navigate back to home

## Implementation Strategy

### Step 1: Complete Hooks (PRIORITY)
✅ Add getter functions for:
- Get game info
- Get player status
- Get current question
- Get voting results
- Get lobby info
- Get available games

### Step 2: State Management
Create `useGameState` hook that:
- Manages current game phase
- Polls blockchain for updates
- Handles state transitions
- Syncs with blockchain events

### Step 3: Component Integration
Update each component to:
- Use real blockchain data
- Handle loading states
- Show transaction progress
- Handle errors gracefully

### Step 4: Real-time Updates
Implement polling strategy:
- Lobby: Poll every 2s for player count
- Active game: Poll every 3s for answers
- Results: One-time fetch

## Key Technical Decisions

### 1. Game Discovery
**Option A**: Create new game each time (current)
**Option B**: Join existing waiting games (better UX)
→ Implement Option B with fallback to Option A

### 2. State Synchronization
- Use blockchain as source of truth
- Local state only for UI optimizations
- Poll for updates (no websockets needed initially)

### 3. Transaction Flow
```
User Action → Sign Transaction → Wait for Confirmation → Poll for State Update → Update UI
```

### 4. Error Handling
- Transaction failures → Show error, allow retry
- Insufficient funds → Clear message
- Network issues → Retry with exponential backoff

## File Structure

```
src/
├── hooks/
│   ├── useGameActions.ts      ✅ (needs getters)
│   ├── useGameData.ts          ✅ (needs enhancement)
│   ├── useGameState.ts         ❌ (NEW - main state manager)
│   ├── useGamePolling.ts       ❌ (NEW - polling logic)
│   └── index.ts
├── services/
│   ├── gameService.ts          ❌ (NEW - blockchain queries)
│   └── transactionService.ts   ❌ (NEW - tx helpers)
├── utils/
│   ├── gameHelpers.ts          ❌ (NEW - formatters, validators)
│   └── constants.ts            ❌ (NEW - polling intervals, etc)
└── components/
    └── [existing components]
```

## Next Steps Priority

1. ✅ **Complete useGameActions with getters**
2. ✅ **Create gameService for all read operations**
3. ✅ **Create useGameState for state management**
4. ✅ **Update App.tsx to use new hooks**
5. ⏳ Test with deployed contract
6. ⏳ Add error boundaries
7. ⏳ Add loading skeletons
8. ⏳ Add transaction notifications

## Blockchain Data Mapping

### Game Object Structure (from contract)
```
Game {
  id: ObjectID,
  tier: u8,
  status: u8,  // 0=Waiting, 1=Active, 2=Finished
  players: vector<address>,
  eliminated: vector<address>,
  current_round: u8,
  current_questioner: address,
  question: Option<Question>,
  answers: Table<address, u8>,
  prize_pool: Balance<SUI>,
  created_at: u64,
}
```

### Mapping to Frontend Types
```typescript
GameInfo {
  gameId: string           ← Game.id
  tier: Tier               ← Game.tier
  status: GameStatus       ← Game.status
  currentRound: number     ← Game.current_round
  playerCount: number      ← Game.players.length
  eliminatedCount: number  ← Game.eliminated.length
  prizePool: number        ← Game.prize_pool
  currentQuestioner: string ← Game.current_questioner
  questionAsked: boolean   ← Game.question.is_some()
}
```

## Polling Strategy

### Lobby Phase
```typescript
Poll every 2 seconds:
- Player count
- Game status
Stop when: status === ACTIVE
```

### Active Game Phase
```typescript
Poll every 3 seconds:
- Current question
- Answer count
- Time remaining
- Round status
Stop when: status === FINISHED
```

### Results Phase
```typescript
One-time fetch:
- Final results
- Prize amount
- Survivors list
```

## Transaction Confirmation Strategy

```typescript
1. Submit transaction
2. Show "Confirming..." state
3. Wait for transaction confirmation (5-10s)
4. Poll for state update (max 30s)
5. Update UI or show error
```

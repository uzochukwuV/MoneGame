# Complete Game Flow Diagram

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │   Home   │→ │  Lobby   │→ │  Active  │→ │ Results  │           │
│  │  Phase   │  │  Phase   │  │  Phase   │  │  Phase   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         useGameState Hook                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  State: phase, gameId, tier, playerCount, question, etc.  │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Actions: createGame, joinGame, askQuestion, submitAnswer │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Polling: Auto-updates every 2-3 seconds                   │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        useGameActions Hook                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Write: createGame, joinGame, askQuestion, submitAnswer    │    │
│  └────────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Read: getGameInfo, getPlayerStatus, getVotingResults      │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Sui Blockchain (Testnet)                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Smart Contract: majority_rules                            │    │
│  │  - Game objects                                            │    │
│  │  - Player data                                             │    │
│  │  - Prize pools                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Phase Flow

### Phase 1: HOME → LOBBY

```
User clicks "Join Battle" on Tier Card
         ↓
handleSelectTier(tier) called
         ↓
actions.createGame(tier)
         ↓
useGameActions.createGame(tier)
         ↓
Create Transaction:
  - target: ${packageId}::majority_rules::create_game
  - arguments: [tier]
         ↓
User signs transaction in wallet
         ↓
Transaction submitted to blockchain
         ↓
Wait for confirmation (5-10 seconds)
         ↓
useGameState updates:
  - state.phase = 'lobby'
  - state.gameId = [game object ID]
  - state.tier = tier
         ↓
Component re-renders → Shows GameLobby
         ↓
Start polling every 2 seconds:
  - getGameInfo(gameId)
  - Update playerCount
  - Check if status === ACTIVE
```

### Phase 2: LOBBY → ACTIVE

```
Polling detects: gameData.status === 1 (ACTIVE)
         ↓
useGameState auto-transitions:
  - state.phase = 'active'
  - state.currentRound = 1
  - state.currentQuestioner = [address]
         ↓
Component re-renders → Shows ActiveGame
         ↓
Start polling every 3 seconds:
  - getGameInfo(gameId)
  - Update question, answers, votingStats
```

### Phase 3: ACTIVE GAME - Question Phase

```
If isQuestioner:
  User fills question form
         ↓
  handleAskQuestion(question, options, myAnswer)
         ↓
  actions.askQuestion(...)
         ↓
  Create Transaction:
    - target: ${packageId}::majority_rules::ask_question
    - arguments: [gameId, question, optionA, optionB, optionC, myAnswer]
         ↓
  User signs transaction
         ↓
  Transaction confirmed
         ↓
  useGameState updates:
    - state.hasAnswered = true
    - state.playerAnswer = myAnswer
         ↓
  Polling detects question in blockchain
         ↓
  All players see the question

If not questioner:
  Wait for question
         ↓
  Polling detects: gameData.question !== null
         ↓
  useGameState updates:
    - state.question = {...}
         ↓
  Component shows question and options
```

### Phase 4: ACTIVE GAME - Answer Phase

```
User selects answer and clicks "Lock In Answer"
         ↓
handleSubmitAnswer(choice)
         ↓
actions.submitAnswer(choice)
         ↓
Create Transaction:
  - target: ${packageId}::majority_rules::submit_answer
  - arguments: [gameId, choice]
         ↓
User signs transaction
         ↓
Transaction confirmed
         ↓
useGameState updates:
  - state.hasAnswered = true
  - state.playerAnswer = choice
         ↓
Polling detects more answers
         ↓
getVotingResults(gameId) called
         ↓
useGameState updates:
  - state.votingStats = { votesA, votesB, votesC, majority }
         ↓
Component shows vote counts
         ↓
If player in minority:
  - Added to eliminated list
  - state.isEliminated = true
```

### Phase 5: ACTIVE → RESULTS

```
Polling detects: gameData.status === 2 (FINISHED)
         ↓
useGameState checks:
  - canClaimPrize(gameId, userAddress)
  - Calculate survivors
         ↓
useGameState updates:
  - state.phase = 'results'
  - state.canClaimPrize = true/false
  - state.survivors = [addresses]
         ↓
Component re-renders → Shows GameResults
         ↓
Stop polling (no longer needed)
```

### Phase 6: RESULTS → HOME

```
If winner:
  User clicks "Claim Prize"
         ↓
  handleClaimPrize()
         ↓
  actions.claimPrize()
         ↓
  Create Transaction:
    - target: ${packageId}::majority_rules::claim_prize
    - arguments: [gameId]
         ↓
  User signs transaction
         ↓
  Prize transferred to user's wallet
         ↓
  actions.leaveGame()

If loser or after claiming:
  User clicks "Play Again"
         ↓
  actions.leaveGame()
         ↓
  useGameState resets all state
         ↓
  state.phase = 'home'
         ↓
  Component re-renders → Shows Home
```

## Polling Strategy Detail

### Lobby Phase Polling (Every 2 seconds)

```javascript
const poll = async () => {
  const gameData = await getGameInfo(gameId);
  
  // Update player count
  setState({ playerCount: gameData.players.length });
  
  // Check for game start
  if (gameData.status === 1) {
    setState({ phase: 'active' });
  }
};

setInterval(poll, 2000);
```

### Active Phase Polling (Every 3 seconds)

```javascript
const poll = async () => {
  const gameData = await getGameInfo(gameId);
  
  // Update question
  if (gameData.question) {
    setState({ question: gameData.question });
  }
  
  // Update voting stats
  if (Object.keys(gameData.answers).length > 0) {
    const votingResults = await getVotingResults(gameId);
    setState({ votingStats: votingResults });
  }
  
  // Check for game end
  if (gameData.status === 2) {
    setState({ phase: 'results' });
  }
};

setInterval(poll, 3000);
```

## Data Transformation

### Blockchain → Frontend

```javascript
// Blockchain data structure
{
  id: "0xabc123...",
  tier: 1,
  status: 1,
  players: ["0x111...", "0x222..."],
  eliminated: ["0x333..."],
  current_round: 2,
  current_questioner: "0x111...",
  question: {
    text: "What is 2+2?",
    option_a: "3",
    option_b: "4",
    option_c: "5"
  },
  answers: {
    "0x111...": 2,
    "0x222...": 2
  },
  prize_pool: "1000000000"
}

// Transformed to frontend state
{
  gameId: "0xabc123...",
  tier: 1,
  status: 1,
  playerCount: 2,
  eliminatedCount: 1,
  currentRound: 2,
  currentQuestioner: "0x111...",
  question: {
    text: "What is 2+2?",
    optionA: "3",
    optionB: "4",
    optionC: "5"
  },
  isQuestioner: false, // (if current user !== "0x111...")
  hasAnswered: true,   // (if current user in answers)
  playerAnswer: 2,     // (answers[currentUser])
  votingStats: {
    votesA: 0,
    votesB: 2,
    votesC: 0,
    majority: 2
  }
}
```

## Error Handling Flow

```
User Action
    ↓
Try {
    Transaction
}
    ↓
Catch (error) {
    ↓
    if (error.includes('Insufficient funds'))
        → Show "Need more SUI"
    ↓
    else if (error.includes('User rejected'))
        → Silent (user cancelled)
    ↓
    else
        → Show generic error
    ↓
    setState({ error: message })
}
    ↓
Component shows error banner
    ↓
User can retry or go back
```

## State Transitions

```
┌──────┐
│ HOME │ ←──────────────────────────────┐
└───┬──┘                                 │
    │ createGame()                       │
    ↓                                    │
┌───────┐                                │
│ LOBBY │                                │
└───┬───┘                                │
    │ Auto (status === ACTIVE)           │
    ↓                                    │
┌────────┐                               │
│ ACTIVE │                               │
└───┬────┘                               │
    │ Auto (status === FINISHED)         │
    ↓                                    │
┌─────────┐                              │
│ RESULTS │                              │
└───┬─────┘                              │
    │ leaveGame()                        │
    └────────────────────────────────────┘
```

## Component Props Flow

```
useGameState
    ↓
state = {
  phase: 'active',
  gameId: '0xabc...',
  tier: 1,
  playerCount: 10,
  question: {...},
  ...
}
    ↓
<ActiveGame
  gameInfo={{
    gameId: state.gameId,
    tier: state.tier,
    playerCount: state.playerCount,
    ...
  }}
  question={state.question}
  isQuestioner={state.isQuestioner}
  hasAnswered={state.hasAnswered}
  ...
/>
```

## Summary

This architecture provides:
- ✅ Automatic state synchronization
- ✅ Real-time updates via polling
- ✅ Clean separation of concerns
- ✅ Type-safe data flow
- ✅ Error handling at every level
- ✅ Minimal re-renders
- ✅ Easy to test and debug

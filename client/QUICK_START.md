# Quick Start: Using Your Game Client in React

## What I've Set Up For You

### 1. **Hooks** (`src/hooks/`)
- `useGameActions.ts` - Execute blockchain transactions (create, join, ask, answer, claim)
- `useGameData.ts` - Fetch and poll game state from blockchain
- `useGameClient.ts` - Initialize your MajorityRulesClient

### 2. **Config** (`src/config/`)
- `game.ts` - Package ID and entry fees configuration

### 3. **Example** (`src/examples/`)
- `GameExample.tsx` - Working example component

## Quick Integration

### Step 1: Update Package ID
```ts
// src/config/game.ts
export const GAME_PACKAGE_ID = '0xYOUR_ACTUAL_PACKAGE_ID';
```

### Step 2: Use in Your Component
```tsx
import { useGameActions } from './hooks/useGameActions';
import { useGameData } from './hooks/useGameData';
import { GAME_PACKAGE_ID, TIER_ENTRY_FEES } from './config/game';

function YourComponent() {
  const { joinGame, isLoading } = useGameActions({ packageId: GAME_PACKAGE_ID });
  const { gameData } = useGameData('GAME_ID_HERE');

  const handleJoin = async () => {
    await joinGame('GAME_ID', 1, TIER_ENTRY_FEES[1]);
  };

  return (
    <div>
      <p>Players: {gameData?.playerCount}</p>
      <button onClick={handleJoin} disabled={isLoading}>
        Join Game
      </button>
    </div>
  );
}
```

### Step 3: Replace Mock Functions in App.tsx

Find this in your `App.tsx`:
```tsx
const handleSelectTier = useCallback((tier: Tier) => {
  // Current mock implementation
  setSelectedTier(tier);
  setGamePhase('lobby');
  // ...
}, [isConnected]);
```

Replace with:
```tsx
import { useGameActions } from './hooks/useGameActions';
import { GAME_PACKAGE_ID } from './config/game';

function App() {
  const { createGame, isLoading } = useGameActions({ packageId: GAME_PACKAGE_ID });

  const handleSelectTier = useCallback(async (tier: Tier) => {
    if (!isConnected) return;

    try {
      const txDigest = await createGame(tier);
      console.log('Game created:', txDigest);
      
      setSelectedTier(tier);
      setGamePhase('lobby');
      // Fetch real game data here
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  }, [isConnected, createGame]);
}
```

## All Available Hooks

```tsx
const { 
  createGame,    // (tier) => Promise<string>
  joinGame,      // (gameId, tier, entryFee) => Promise<string>
  askQuestion,   // (gameId, q, a, b, c, myAnswer) => Promise<string>
  submitAnswer,  // (gameId, choice) => Promise<string>
  claimPrize,    // (gameId) => Promise<string>
  isLoading,     // boolean
  error          // string | null
} = useGameActions({ packageId: GAME_PACKAGE_ID });

const { 
  gameData,      // GameData | null
  isLoading,     // boolean
  error          // string | null
} = useGameData(gameId);
```

## Important Notes

✅ **User pays entry fee** - When joining, coins are taken from user's wallet
✅ **Wallet must be connected** - All actions require connected wallet
✅ **Auto-polling** - `useGameData` polls every 5 seconds for updates
✅ **Error handling** - All hooks provide error states

## Testing

See `src/examples/GameExample.tsx` for a complete working example you can test with.

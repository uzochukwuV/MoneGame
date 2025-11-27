# Game Client Integration Guide

## Setup

1. **Update Package ID**: Edit `src/config/game.ts` and replace `0x_YOUR_PACKAGE_ID_HERE` with your deployed contract package ID.

2. **The hooks are ready to use** in your React components.

## Usage Examples

### 1. Using Game Actions Hook

```tsx
import { useGameActions } from './hooks/useGameActions';
import { GAME_PACKAGE_ID, TIER_ENTRY_FEES } from './config/game';

function MyComponent() {
  const { createGame, joinGame, isLoading, error } = useGameActions({ 
    packageId: GAME_PACKAGE_ID 
  });

  const handleJoinGame = async () => {
    try {
      const txDigest = await joinGame(
        'GAME_ID_HERE',
        1, // Tier 1
        TIER_ENTRY_FEES[1] // Entry fee
      );
      console.log('Transaction:', txDigest);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button onClick={handleJoinGame} disabled={isLoading}>
      {isLoading ? 'Joining...' : 'Join Game'}
    </button>
  );
}
```

### 2. Integrating into Your App.tsx

Replace the mock `handleSelectTier` function with real blockchain calls:

```tsx
import { useGameActions } from './hooks/useGameActions';
import { GAME_PACKAGE_ID, TIER_ENTRY_FEES } from './config/game';

function App() {
  const currentAccount = useCurrentAccount();
  const { createGame, joinGame, isLoading } = useGameActions({ 
    packageId: GAME_PACKAGE_ID 
  });

  const handleSelectTier = async (tier: Tier) => {
    if (!currentAccount) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // Create or join a game
      const txDigest = await createGame(tier);
      
      // Update UI state
      setSelectedTier(tier);
      setGamePhase('lobby');
      
      // You can fetch game info from the blockchain here
      // const gameInfo = await fetchGameInfo(txDigest);
      
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  };

  // ... rest of your component
}
```

### 3. Available Actions

All actions return a transaction digest (string) on success:

- **createGame(tier)**: Create a new game
- **joinGame(gameId, tier, entryFee)**: Join an existing game (user pays entry fee)
- **askQuestion(gameId, question, optionA, optionB, optionC, myAnswer)**: Ask a question
- **submitAnswer(gameId, choice)**: Submit an answer (1, 2, or 3)
- **claimPrize(gameId)**: Claim prize after winning

### 4. Error Handling

```tsx
const { joinGame, error } = useGameActions({ packageId: GAME_PACKAGE_ID });

useEffect(() => {
  if (error) {
    // Show error to user
    alert(error);
  }
}, [error]);
```

### 5. Loading States

```tsx
const { joinGame, isLoading } = useGameActions({ packageId: GAME_PACKAGE_ID });

return (
  <button disabled={isLoading}>
    {isLoading ? 'Processing...' : 'Join Game'}
  </button>
);
```

## Key Points

1. **User pays entry fee**: When joining a game, the user's wallet pays the entry fee from their balance
2. **Gas sponsorship**: Can be added later by integrating the GasSponsor class
3. **Wallet required**: All actions require a connected wallet via `useCurrentAccount()`
4. **Transaction signing**: Handled automatically by `useSignAndExecuteTransaction()` hook

## Next Steps

1. Update `GAME_PACKAGE_ID` in `src/config/game.ts`
2. Replace mock functions in `App.tsx` with real blockchain calls
3. Add game state fetching from the blockchain
4. Implement gas sponsorship if needed

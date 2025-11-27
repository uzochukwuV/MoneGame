# GAME DISCOVERY: INTEGRATED TESTING STRATEGY
## Console-Based, Component-Integrated Testing

---

## TESTING PHILOSOPHY

**No separate test files.** Instead:
1. Build the component
2. Add console.log statements throughout
3. Test in browser DevTools console
4. Use browser's Network tab to verify blockchain calls
5. Move to next component when working

---

## TEST FLOW FOR GAME DISCOVERY

### Step 1: Hook Testing (useGameDiscovery.ts)

**Where to test:** Browser console when component mounts

**Console logs to add:**

```typescript
// In useGameDiscovery hook:

// On mount
console.log('🎮 Game Discovery Hook Initializing');
console.log('📦 Package ID:', packageId);
console.log('⏱️ Refresh Interval:', refreshInterval);

// Before fetching
console.log('🔍 Fetching games from blockchain...');

// After queryEvents
console.log('📊 GameCreated Events:', gameCreatedEvents.data?.length);
console.log('🎲 Game IDs found:', gameIds);

// After fetching objects
console.log('📥 Game objects fetched:', gameObjects.length);

// Processing games
gameObjects.forEach((obj, i) => {
  console.log(`Game ${i}:`, {
    gameId: gameIds[i],
    status: fields.status,
    players: fields.players?.length,
    prizePool: fields.prize_pool?.value,
  });
});

// Final result
console.log('✅ Available games:', availableGames);
console.log('📈 Total waiting games:', availableGames.length);
```

---

### Step 2: Component Testing (GameDiscovery.tsx)

**Where to test:** Browser page when rendered

**Console logs to add:**

```typescript
// In GameDiscovery component:

// On mount
console.log('🎯 GameDiscovery Component Mounted');
console.log('📋 Tier:', tier);

// When games load
console.log('�� Games loaded:', games);
console.log('📊 Game count by tier:', games.length);

// When user filters
console.log('🔎 Filtering by:', filters);
console.log('📉 Filtered results:', filteredGames);

// When user sorts
console.log('📊 Sorting by:', sortBy);
console.log('📈 Sorted results:', sortedGames);

// When user clicks join
console.log('➡️ Joining game:', gameId);
console.log('💰 Entry fee:', entryFee);

// When user clicks create new
console.log('🆕 Creating new game for tier:', tier);
```

---

## TESTING CHECKLIST

### Test 1: Hook Initialization ✓
- [ ] useGameDiscovery initializes without errors
- [ ] Console shows: Package ID loaded
- [ ] Console shows: Refresh interval set

### Test 2: Event Querying ✓
- [ ] suiClient.queryEvents called
- [ ] Console shows: Number of GameCreated events
- [ ] Console shows: Game IDs extracted

### Test 3: Object Fetching ✓
- [ ] suiClient.getObject called for each game
- [ ] Console shows: Number of objects fetched
- [ ] Console shows: Game data parsed correctly

### Test 4: Game Filtering ✓
- [ ] Status check: Only WAITING (0) games included
- [ ] Console shows: Games filtered by status
- [ ] Non-waiting games excluded

### Test 5: Data Transformation ✓
- [ ] Fields properly mapped to AvailableGame interface
- [ ] Console shows: Game objects structure
- [ ] Tier, status, playerCount, prizePool all present

### Test 6: Component Rendering ✓
- [ ] GameDiscovery component renders without errors
- [ ] Console shows: Games loaded
- [ ] UI displays game list

### Test 7: User Interactions ✓
- [ ] Filter works, console shows filtered games
- [ ] Sort works, console shows sorted games
- [ ] Join button callable, logs game ID
- [ ] Create new button callable, logs tier

### Test 8: Error Handling ✓
- [ ] Invalid package ID caught
- [ ] Network errors logged
- [ ] User sees error message

---

## BROWSER TESTING STEPS

### Step 1: Start the App

```bash
cd client
npm run dev
```

Open `http://localhost:5173` in browser

---

### Step 2: Open DevTools

Press `F12` → Go to **Console** tab

---

### Step 3: Navigate to Game Discovery

1. In app UI, click on a Tier
2. Should render GameDiscovery component
3. Watch console for logs

---

### Step 4: Check Console Output

**Expected output on load:**

```
🎮 Game Discovery Hook Initializing
📦 Package ID: 0x...
⏱️ Refresh Interval: 5000
🔍 Fetching games from blockchain...
📊 GameCreated Events: 0  (if no games yet)
🎲 Game IDs found: []
📥 Game objects fetched: 0
✅ Available games: []
📈 Total waiting games: 0
```

**If there are existing games on blockchain:**

```
📊 GameCreated Events: 5
🎲 Game IDs found: ['0x123...', '0x456...', ...]
📥 Game objects fetched: 5
Game 0: {
  gameId: '0x123...',
  status: 0,
  players: 8,
  prizePool: '80000000000'
}
✅ Available games: [...]
📈 Total waiting games: 5
```

---

### Step 5: Check Network Tab

In DevTools:
1. Go to **Network** tab
2. Filter by `XHR` or `Fetch`
3. Look for calls to Sui RPC endpoint:
   - `queryEvents` call → Shows GameCreated events
   - `getObject` calls → Shows game object fetches

**Expected network requests:**

```
POST https://rpc-testnet.onelabs.cc
  Payload: {"method":"sui_queryEvents","params":[...]}
  Response: {
    "result": {
      "data": [GameCreated events...]
    }
  }

POST https://rpc-testnet.onelabs.cc
  Payload: {"method":"sui_getObject","params":["0x123..."]}
  Response: {
    "result": {
      "data": {
        "content": {
          "fields": {
            "tier": 1,
            "status": 0,
            "players": [...],
            ...
          }
        }
      }
    }
  }
```

---

## TESTING SCENARIOS

### Scenario 1: No Games Exist

**Setup:** Fresh blockchain, no games created yet

**Expected Behavior:**
- Console: `📈 Total waiting games: 0`
- UI: "No games waiting. [Create New Game] button"
- Error: None

**Test:**
```javascript
// In console, manually check
console.log('Games:', games);
console.log('Is empty:', games.length === 0);
```

---

### Scenario 2: One Game Exists

**Setup:** Create one game manually, then load discovery

**Expected Behavior:**
- Console: `📈 Total waiting games: 1`
- UI: Shows 1 game card
- Card displays: Players (1/50), Prize Pool, Tier
- [JOIN] button present

**Test:**
```javascript
// Verify game structure
console.log('First game:', games[0]);
console.log('Has required fields:', {
  gameId: !!games[0].gameId,
  tier: games[0].tier,
  playerCount: games[0].playerCount,
  prizePool: games[0].prizePool,
});
```

---

### Scenario 3: Multiple Games Exist

**Setup:** Create 3+ games in different tiers

**Expected Behavior:**
- Console: `📈 Total waiting games: 3+`
- UI: Shows all games
- Filter by tier works
- Sort by players/prize works

**Test:**
```javascript
// Test filtering
console.log('All games:', games);
console.log('Tier 1 games:', getGamesByTier(1));
console.log('Tier 3 games:', getGamesByTier(3));

// Test sorting
console.log('Sorted by players:', filterGames({sortBy: 'players'}));
console.log('Sorted by prize:', filterGames({sortBy: 'prize'}));
```

---

### Scenario 4: User Joins Game

**Setup:** Games loaded, user clicks [JOIN]

**Expected Behavior:**
- Console: `➡️ Joining game: 0x123...`
- Console: `💰 Entry fee: 10000000`
- Call `onSelectGame(gameId)` callback
- Navigate to Lobby phase

**Test:**
```javascript
// Verify join works
console.log('Joining game:', selectedGame);
console.log('Callback called:', onSelectGameCalled);
```

---

### Scenario 5: User Creates New Game

**Setup:** Games loaded, user clicks [CREATE NEW]

**Expected Behavior:**
- Console: `🆕 Creating new game for tier: 1`
- Call `onCreateNew()` callback
- Create transaction for create_game

**Test:**
```javascript
// Verify create works
console.log('Creating game for tier:', selectedTier);
console.log('Callback called:', onCreateNewCalled);
```

---

## CONSOLE DEBUGGING COMMANDS

**Run these in browser console to test:**

```javascript
// Check if hook is working
console.log('Games:', games);
console.log('Is loading:', isLoading);
console.log('Error:', error);

// Check game structure
console.log('First game:', games[0]);
console.log('Game keys:', Object.keys(games[0]));

// Test filtering
console.log('Tier 1:', getGamesByTier(1));
console.log('Tier 3:', getGamesByTier(3));

// Test sorting
console.log('By players:', filterGames({sortBy: 'players'}));
console.log('By prize:', filterGames({sortBy: 'prize'}));

// Check last update
console.log('Last updated:', new Date(lastUpdated).toLocaleString());

// Manual refresh
refresh();
console.log('Refresh triggered');
```

---

## COMMON ISSUES & DEBUGGING

### Issue 1: Games list is empty but should have games

**Debug steps:**

```javascript
// Check hook state
console.log('Hook state:', {
  games: games.length,
  isLoading,
  error
});

// Check if queryEvents is working
console.log('Recent events count:', gameCreatedEvents?.length);

// Check package ID
console.log('Package ID valid:', !packageId.includes('YOUR_PACKAGE_ID'));
```

**Common cause:** Package ID not configured
**Fix:** Update `GAME_PACKAGE_ID` in `client/src/config/game.ts`

---

### Issue 2: Games list shows old data

**Debug steps:**

```javascript
console.log('Last updated:', lastUpdated);
console.log('Time since update (ms):', Date.now() - lastUpdated);
console.log('Should refresh:', (Date.now() - lastUpdated) > 5000);
```

**Common cause:** Auto-refresh disabled
**Fix:** Check `autoRefresh` prop is true (default)

---

### Issue 3: Network errors in console

**Debug steps:**

```javascript
console.log('Error message:', error);
console.log('Network tab:', 'Check XHR requests');
console.log('RPC endpoint:', 'Verify in config');
```

**Common cause:** RPC endpoint unreachable
**Fix:** Check network connectivity, RPC endpoint URL

---

### Issue 4: Game data incomplete

**Debug steps:**

```javascript
console.log('Raw game object:', gameObjects[0]);
console.log('Parsed fields:', gameObjects[0]?.data?.content?.fields);
console.log('Transformed game:', games[0]);
```

**Common cause:** Field names mismatch with contract
**Fix:** Verify field names match `game.move` struct

---

## TESTING PROGRESSION

1. **✅ Start:** Build useGameDiscovery hook
2. **✅ Test:** Console logs show events/objects fetched
3. **✅ Build:** Create GameDiscovery component
4. **✅ Test:** Console logs show games rendered
5. **✅ Build:** Add filter/sort functionality
6. **✅ Test:** Console logs show filtered/sorted results
7. **✅ Build:** Add join/create buttons
8. **✅ Test:** Console logs show button clicks
9. **✅ Next:** Integrate into App.tsx

---

## SUCCESS CRITERIA

GameDiscovery is working when:

- ✅ Hook initializes without errors
- ✅ Console shows games fetched from blockchain
- ✅ Component renders game list
- ✅ Filter by tier works (console log shows filtered games)
- ✅ Sort works (console log shows sorted games)
- ✅ Join button triggers callback (console log shows game ID)
- ✅ Create button triggers callback (console log shows tier)
- ✅ No errors in console
- ✅ Network tab shows RPC calls to blockchain
- ✅ Data refreshes every 5 seconds (check lastUpdated in console)

---

**Ready to build with integrated testing!**

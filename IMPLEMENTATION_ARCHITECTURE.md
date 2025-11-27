# MAJORITY RULES: IMPLEMENTATION ARCHITECTURE
## Visual Flow & Component Structure

---

## SECTION 1: COMPLETE USER JOURNEY FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER JOURNEY MAP                            │
└─────────────────────────────────────────────────────────────────────┘

                              HOME
                               ↓
                    [Select Action]
                    ├─ Play
                    ├─ My Stats
                    ├─ How to Play
                    └─ Browse All Games
                               ↓
        ┌──────────────────────┼──────────────────────┐
        ↓                      ↓                      ↓
   SELECT TIER        BROWSE ALL GAMES      VIEW STATS/HISTORY
        ↓                      ↓                      ↓
   GAME DISCOVERY      ALL GAMES LIST        PLAYER STATS
   (New Flow)          (All Tiers)           + HISTORY
        ├─ Search         ├─ Tier 1           ├─ Total Games
        ├─ Filter         ├─ Tier 2           ├─ Wins/Losses
        └─ Sort           ├─ Tier 3           ├─ Total Prizes
                          ├─ Tier 4           ├─ Win Rate
              ┌───────────├─ Tier 5           └─ Leaderboard
              ↓           └─ Filter/Sort
     ┌────────────────┐       ↓
     ├─ Join Existing │  GAME DETAILS
     └─ Create New    │  (Tier-specific)
          ↓           ├─ Players: 5/50
          ↓           ├─ Prize Pool: 50 OCT
          ↓           ├─ Status: Waiting
          ↓           └─ [JOIN] Button
          ↓                ↓
       LOBBY    ────────────┘
       (Waiting)
          ↓
     [Game Starts]
          ↓
     ACTIVE GAME
          ├─ Questioner View
          │  ├─ Form: Question
          │  ├─ Form: Options A/B/C
          │  └─ Select: My Answer
          │
          └─ Voter View
             ├─ Display: Question
             ├─ Display: Options A/B/C
             ├─ Click: Vote (1/2/3)
             └─ Show: Vote Count
          ↓
     [3 Rounds Complete]
          ↓
       RESULTS
          ├─ Winner Path
          │  ├─ Show: Prize Amount
          │  ├─ Button: Claim Prize
          │  └─ Button: Play Again
          │
          └─ Loser Path
             ├─ Show: Elimination Details
             ├─ Show: Survivor Count
             └─ Button: Play Again
          ↓
        HOME (Loop back)
```

---

## SECTION 2: CURRENT VS NEW COMPONENT STRUCTURE

### CURRENT ARCHITECTURE (What Exists)

```
App.tsx
├── Header
│   └── ConnectButton
├── Home Phase
│   ├── Hero Section
│   ├── TierSelection
│   └── HowToPlay
├── Lobby Phase
│   └── GameLobby
│       ├── Player Counter
│       └── Progress Bar
├── Active Phase
│   └── ActiveGame
│       ├── [Questioner] Question Form
│       └── [Voter] Vote Buttons
└── Results Phase
    └── GameResults
        ├── Winner/Loser Display
        └── Claim/Replay Buttons

Hooks:
├── useGameState (mock data)
├── useGameActions (blockchain calls)
├── useGameClient
└── useGameData

Total Components: 6
Total Hooks: 4
```

### NEW REQUIRED ARCHITECTURE

```
App.tsx (UPDATED)
├── Header
│   └── ConnectButton
├── Home Phase (UPDATED)
│   ├── Navigation Tabs
│   │  ├─ Play (default)
│   │  ├─ Browse All
│   │  ├─ My Stats
│   │  └─ How to Play
│   │
│   └─ Content Area
│      ├─ TierSelection
│      ├─ AllGamesBrowser (NEW)
│      ├─ PlayerStats (NEW)
│      └─ HowToPlay
│
├── Discovery Phase (NEW)
│   └── GameDiscovery (NEW)
│       ├─ Available Games List
│       ├─ Join Button per Game
│       └─ Create New Button
│
├── Lobby Phase (UNCHANGED)
│   └── GameLobby
│
├── Active Phase (UNCHANGED)
│   └── ActiveGame
│
└── Results Phase (UNCHANGED)
    └── GameResults

Hooks:
├── useGameState (ENHANCED: real data)
├── useGameActions (ENHANCED: discovery)
├── useGameClient
├── useGameData
├── useGameDiscovery (NEW)
├── usePlayerHistory (NEW)
└── usePlayerStats (NEW)

Components Added: 4
├─ AllGamesBrowser
├─ GameDiscovery
├─ PlayerStats
└─ GameHistory

Hooks Added: 3
├─ useGameDiscovery
├─ usePlayerHistory
└─ usePlayerStats

Total Components: 10
Total Hooks: 7
```

---

## SECTION 3: PHASE-BASED IMPLEMENTATION

### PHASE 2: GAME DISCOVERY (2-3 hours)

#### New Component: GameDiscovery.tsx

```
GameDiscovery.tsx
├── Props:
│   ├─ tier: Tier
│   ├─ onSelectGame: (gameId) => void
│   ├─ onCreateNew: () => void
│   └─ onCancel: () => void
│
├── State:
│   ├─ availableGames: Game[]
│   ├─ isLoading: boolean
│   ├─ error: string | null
│   └─ sortBy: 'players' | 'prize'
│
├── Render:
│   ├─ Header: "Games Waiting for {tier}"
│   ├─ [Back] [Refresh] [Sort ▼]
│   ├─ Game List
│   │  └─ GameCard (repeated)
│   │     ├─ Tier Badge
│   │     ├─ Players: X/50
│   │     ├─ Prize Pool: X OCT
│   │     ├─ Time Waiting: X mins
│   │     └─ [JOIN] Button
│   │
│   ├─ OR Section
│   │  └─ [CREATE NEW GAME] Button
│   │
│   └─ Loading/Error States

Hooks:
├─ useGameDiscovery(tier)
│  └─ Returns: availableGames[], isLoading, error
│
├─ useGameActions(packageId)
│  └─ joinGame(gameId, tier, fee)
```

#### New Hook: useGameDiscovery.ts

```typescript
// useGameDiscovery.ts
function useGameDiscovery(tier: Tier) {
  const suiClient = useSuiClient();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true);
      try {
        // Option 1: Query events for GameCreated
        const events = await suiClient.queryEvents({
          query: { MoveEvent: `${packageId}::battle_royale::GameCreated` },
        });

        // Filter by tier + status=WAITING
        const waitingGames = events.data
          .filter(e => e.parsedJson?.tier === tier)
          .map(e => ({ gameId: e.parsedJson?.game_id, ...e.parsedJson }));

        // Get full game objects
        const fullGames = await Promise.all(
          waitingGames.map(g => getGameInfo(g.gameId))
        );

        setGames(fullGames.filter(g => g && g.status === 0)); // WAITING
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
    const interval = setInterval(fetchGames, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [tier, suiClient, packageId]);

  return { games, isLoading, error };
}
```

---

### PHASE 3: GAME HISTORY (3-4 hours)

#### New Component: PlayerStats.tsx

```
PlayerStats.tsx
├── Props:
│   └─ playerAddress: string
│
├── State:
│   ├─ stats: PlayerStats
│   ├─ isLoading: boolean
│   └─ error: string | null
│
└── Render:
    ├─ Stats Cards (Grid)
    │  ├─ Total Games: X
    │  ├─ Wins: X (Y%)
    │  ├─ Total Prizes: X OCT
    │  ├─ Avg Prize: X OCT
    │  ├─ Avg Position: X
    │  └─ Current Streak: X
    │
    └─ [View History] Button

Hooks:
└─ usePlayerStats(playerAddress)
   └─ Returns: stats, isLoading, error
```

#### New Component: GameHistory.tsx

```
GameHistory.tsx
├── Props:
│   └─ playerAddress: string
│
├── State:
│   ├─ games: PlayerGame[]
│   ├─ isLoading: boolean
│   ├─ filter: 'all' | 'won' | 'lost'
│   └─ sortBy: 'recent' | 'prizes' | 'tier'
│
└── Render:
    ├─ Filters: [All] [Won] [Lost]
    ├─ Sort: [Recent ▼] [Prizes ▼] [Tier ▼]
    ├─ History List
    │  └─ HistoryCard (repeated)
    │     ├─ Tier Badge
    │     ├─ Date: X days ago
    │     ├─ Result: WINNER / ELIMINATED
    │     ├─ Prize: X OCT (or '-')
    │     ├─ Duration: X mins
    │     └─ [View Details] Button

Hooks:
└─ usePlayerHistory(playerAddress)
   └─ Returns: games[], isLoading, error
```

#### New Hook: usePlayerHistory.ts

```typescript
// usePlayerHistory.ts
function usePlayerHistory(playerAddress: string) {
  const suiClient = useSuiClient();
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        // Get all PlayerTickets owned by player
        const objects = await suiClient.getOwnedObjects({
          owner: playerAddress,
          options: { showContent: true, showType: true },
        });

        const tickets = objects.data
          .filter(obj => obj.data?.type?.includes('PlayerTicket'))
          .map(obj => {
            const fields = (obj.data?.content as any)?.fields;
            return {
              gameId: fields.game_id,
              tier: fields.tier,
              points: fields.points,
              endingRound: fields.ending_round,
              survived: fields.survived,
              timestamp: obj.data?.publishedAtTxDigest,
            };
          });

        // Fetch full game info for each
        const fullGames = await Promise.all(
          tickets.map(t => getGameInfo(t.gameId))
        );

        setGames(fullGames.map((g, i) => ({
          ...g,
          playerTicket: tickets[i],
          result: tickets[i].survived ? 'WINNER' : 'ELIMINATED',
          prizeWon: tickets[i].survived ? calculatePrizeShare(g) : 0,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [playerAddress, suiClient]);

  return { games, isLoading };
}
```

---

### PHASE 4: MULTI-TIER BROWSING (2-3 hours)

#### New Component: AllGamesBrowser.tsx

```
AllGamesBrowser.tsx
├── Props:
│   ├─ onSelectGame: (gameId, tier) => void
│   └─ onCancel: () => void
│
├── State:
│   ├─ selectedTier: Tier | null (all)
│   ├─ sortBy: 'players' | 'prize' | 'tier'
│   ├─ allGames: Game[]
│   └─ isLoading: boolean
│
└── Render:
    ├─ Header: "Browse All Games"
    ├─ Filter Bar
    │  ├─ [All Tiers ▼]
    │  ├─ [All Tiers]
    │  ├─ [Tier 1: Casual]
    │  ├─ [Tier 2: Rookie]
    │  ├─ [Tier 3: Pro]
    │  ├─ [Tier 4: Elite]
    │  └─ [Tier 5: Whale]
    │
    ├─ Sort Options: [Players ▼] [Prize ▼] [Tier ▼]
    │
    ├─ Games Grid
    │  └─ GameCard (Multi-tier version)
    │     ├─ Tier Tag (color-coded)
    │     ├─ Players: X/50
    │     ├─ Prize Pool: X OCT
    │     ├─ Entry Fee: X OCT
    │     └─ [JOIN] Button
    │
    └─ Empty State: "No games waiting. Create one?"

Hooks:
└─ useGameDiscovery(selectedTier)
   └─ Returns: games[], isLoading, error
```

---

## SECTION 4: DATA FLOW UPDATES

### Before (Current)

```
User clicks Tier
    ↓
handleSelectTier()
    ↓
Create random gameId
    ↓
Immediate → Lobby phase
```

### After (New)

```
User clicks Tier
    ↓
handleSelectTier()
    ↓
Set phase = 'discovery'
    ↓
GameDiscovery component mounts
    ↓
useGameDiscovery(tier) hook
    ↓
Query blockchain for waiting games
    ├─ Option A: Join existing game
    │  └─ joinGame(gameId)
    │     ↓
    │     → Lobby phase
    │
    └─ Option B: Create new game
       └─ createGame(tier)
          ↓
          Parse txDigest for game ID
          ↓
          → Lobby phase
```

---

## SECTION 5: STATE MANAGEMENT UPDATES

### Current App.tsx State

```typescript
const [gamePhase, setGamePhase] = useState<GamePhase>('home');
const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
// ... 8 more state variables
```

### New App.tsx State

```typescript
const [gamePhase, setGamePhase] = useState<GamePhase>('home');
const [homeTab, setHomeTab] = useState<'play' | 'browse' | 'stats' | 'rules'>('play');
const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
// ... rest of game state
```

---

## SECTION 6: CONDITIONAL RENDERING STRUCTURE

### Current (Simple)

```typescript
if (gamePhase === 'home') { <TierSelection /> }
if (gamePhase === 'lobby') { <GameLobby /> }
if (gamePhase === 'active') { <ActiveGame /> }
if (gamePhase === 'results') { <GameResults /> }
```

### New (Enhanced)

```typescript
if (gamePhase === 'home') {
  if (homeTab === 'play') { <TierSelection /> }
  if (homeTab === 'browse') { <AllGamesBrowser /> }
  if (homeTab === 'stats') { <PlayerStats /> }
  if (homeTab === 'rules') { <HowToPlay /> }
}
if (gamePhase === 'discovery') { <GameDiscovery /> }
if (gamePhase === 'lobby') { <GameLobby /> }
if (gamePhase === 'active') { <ActiveGame /> }
if (gamePhase === 'results') { <GameResults /> }
```

---

## SECTION 7: API/QUERY UPDATES

### useGameActions - New Methods

```typescript
// EXISTING (Keep all)
createGame(tier)
joinGame(gameId, tier, fee)
askQuestion(...)
submitAnswer(...)
claimPrize(gameId)

// NEW METHODS NEEDED
getAvailableGames(tier: Tier): Promise<Game[]>
getAllWaitingGames(): Promise<Game[]>
getPlayerTickets(address): Promise<PlayerTicket[]>
getGameDetails(gameId): Promise<Game>
```

### Smart Contract - No Changes Needed ✅

All required functions already exist:
- `create_game()` ✅
- `join_game()` ✅
- `ask_question()` ✅
- `submit_answer()` ✅
- `finalize_round()` ✅
- `claim_prize()` ✅
- `get_game_info()` ✅
- View functions ✅

---

## SECTION 8: IMPLEMENTATION CHECKLIST

### Phase 2: Game Discovery

- [ ] Create GameDiscovery.tsx component
  - [ ] GameCard subcomponent
  - [ ] Conditional rendering (has games vs. none)
- [ ] Create useGameDiscovery hook
  - [ ] Query events for GameCreated
  - [ ] Filter by tier + status
  - [ ] Get full game objects
  - [ ] Polling every 5 seconds
- [ ] Update useGameActions
  - [ ] Add getAvailableGames()
  - [ ] Add event query support
- [ ] Update App.tsx
  - [ ] Add 'discovery' phase
  - [ ] Update handleSelectTier()
  - [ ] Add phase rendering

### Phase 3: Game History

- [ ] Create PlayerStats.tsx component
  - [ ] Stats cards grid
  - [ ] Calculate stats from history
- [ ] Create GameHistory.tsx component
  - [ ] HistoryCard subcomponent
  - [ ] Filter: all/won/lost
  - [ ] Sort: recent/prizes/tier
- [ ] Create usePlayerHistory hook
  - [ ] Query PlayerTickets
  - [ ] Get full game info for each
  - [ ] Calculate win rate, prizes, etc.
- [ ] Update App.tsx
  - [ ] Add 'stats' tab to home
  - [ ] Conditional rendering for tab
  - [ ] Navigation between tabs

### Phase 4: Multi-Tier Browsing

- [ ] Create AllGamesBrowser.tsx component
  - [ ] Tier filter selector
  - [ ] Sort controls
  - [ ] Multi-tier game cards
- [ ] Update App.tsx
  - [ ] Add 'browse' tab to home
  - [ ] Call getAllWaitingGames()
  - [ ] No tier pre-selection

### Phase 5: Polish

- [ ] Replace mock timers with real polling
- [ ] Add error boundaries
- [ ] Add loading skeletons
- [ ] Add gas sponsorship integration
- [ ] Style refinements

---

## SECTION 9: MIGRATION PATH

### For Each New Component:

1. **Create Component Scaffold**
   ```
   client/src/components/NewComponent.tsx
   ```

2. **Create Hook If Needed**
   ```
   client/src/hooks/useNewLogic.ts
   ```

3. **Add to exports**
   ```
   client/src/hooks/index.ts
   client/src/components/index.ts (if exists)
   ```

4. **Integrate into App.tsx**
   - Import component
   - Add state for component
   - Add conditional render
   - Add event handlers

5. **Test Integration**
   - Mock data first
   - Then blockchain data
   - Then real wallet

---

## SECTION 10: TIME BREAKDOWN

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| 2 | GameDiscovery component | 1h | None |
| 2 | useGameDiscovery hook | 1h | getAvailableGames |
| 2 | Update getAvailableGames | 30m | useGameActions |
| 2 | Integration in App.tsx | 30m | All above |
| **2 Total** | | **3h** | |
| | | | |
| 3 | PlayerStats component | 1h | None |
| 3 | GameHistory component | 1.5h | None |
| 3 | usePlayerHistory hook | 1.5h | None |
| 3 | Integration in App.tsx | 1h | All above |
| **3 Total** | | **5h** | |
| | | | |
| 4 | AllGamesBrowser component | 1h | None |
| 4 | useGameDiscovery for all | 30m | Existing |
| 4 | Integration in App.tsx | 1h | All above |
| **4 Total** | | **2.5h** | |
| | | | |
| 5 | Real polling setup | 1h | Existing hooks |
| 5 | Error boundaries | 1h | Existing |
| 5 | Loading states | 1h | Existing |
| **5 Total** | | **3h** | |
| | | | |
| **GRAND TOTAL** | | **13.5h** | |

---

**Total Implementation: ~2 weeks (part-time) or ~1 week (full-time)**

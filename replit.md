# Majority Rules - OneChain Battle Royale Game

## Overview
A blockchain-based battle royale game where players vote on questions and the majority wins. Survive 3 elimination rounds and split the prize pool with fellow survivors. Built on OneChain (Sui-based) with wallet integration for blockchain interactions.

## Project Type
Full-stack application with:
- **Frontend**: React + Vite + TypeScript web application (port 5000)
- **Backend SDK**: TypeScript library for blockchain interaction with OneChain

## Status: MVP Complete ✅
- Frontend UI fully functional with dark theme, glassmorphism, purple/cyan gradients
- All game components implemented (TierSelection, GameLobby, ActiveGame, GameResults, HowToPlay)
- Wallet connection modal with demo wallet support
- Ready for real Sui dApp Kit integration with OneChain network

## Recent Changes (November 27, 2025)
- Downgraded React from 19 to 18 for stability
- Implemented wallet connection modal UI with gradient styling
- Added demo wallet support for immediate gameplay
- All game mechanics working with simulated state
- Ready for blockchain integration

## Project Architecture

### Core Structure
```
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── Header.tsx     # Nav + wallet button
│   │   │   ├── TierSelection.tsx
│   │   │   ├── GameLobby.tsx
│   │   │   ├── ActiveGame.tsx
│   │   │   ├── GameResults.tsx
│   │   │   └── HowToPlay.tsx
│   │   ├── types/game.ts      # TypeScript interfaces
│   │   ├── App.tsx            # Main component with game logic
│   │   ├── index.css          # Global styles + animations
│   │   └── main.tsx           # React root
│   ├── vite.config.ts
│   └── package.json
├── game_onchain/src/          # Backend SDK (ready for integration)
│   ├── client.ts              # MajorityRulesClient
│   ├── sponsor.ts             # GasSponsor system
│   ├── types.ts               # Type definitions
│   └── index.ts               # Exports
└── package.json
```

## Frontend Components

1. **Header** - Wallet connection button displaying demo wallet address
2. **TierSelection** - Choose entry tier (0.01-100 OCT)
3. **GameLobby** - Wait for players, simulated count
4. **ActiveGame** - Vote on questions, see results in real-time
5. **GameResults** - Final standings and prize distribution
6. **HowToPlay** - Game rules and mechanics

## Game Flow
1. Connect wallet → 2. Select tier → 3. Join lobby → 4. Wait for players (10+) → 5. Play 3 elimination rounds → 6. Claim prizes

## Wallet Integration

### Current Implementation
- Demo wallet button in header with modal selector
- Shows connected address as "0x0000...0000" format
- Ready to swap with real Sui dApp Kit

### Next Steps for Real Wallet
1. Set up providers in main.tsx with OneChain network config:
   ```typescript
   const { networkConfig } = createNetworkConfig({
     testnet: { url: 'https://rpc-testnet.onelabs.cc:443' },
     mainnet: { url: 'https://rpc-mainnet.onelabs.cc:443' },
   })
   ```
2. Wrap App with SuiClientProvider + WalletProvider
3. Replace Header's demo modal with ConnectButton from @mysten/dapp-kit
4. Use useCurrentAccount() in App.tsx for real address
5. Connect to MajorityRulesClient for blockchain interactions

## Game Tiers & Fees
- TIER_1: 0.01 OCT
- TIER_2: 0.1 OCT
- TIER_3: 1 OCT
- TIER_4: 10 OCT
- TIER_5: 100 OCT

## Smart Contract
- Package ID: 0x16d2cab2772b1fc4372cefe3a50c76bc3c18feb9b7b685f56cd7b46c9e923d0a
- Network: OneChain (Sui-compatible)
- Testnet RPC: https://rpc-testnet.onelabs.cc:443

## UI Design
- **Theme**: Dark (#0a0a0f background)
- **Accents**: Purple/Cyan gradient (#7c3aed → #06b6d4)
- **Effects**: Glassmorphism, smooth animations, blur backdrops
- **Fonts**: Space Grotesk (headings), Inter (body)
- **Style**: Modern, inspired by yellow.network & reactive.network

## Running Locally
```bash
cd client
npm install
npm run dev
```
Frontend opens at http://localhost:5000

## Dependencies
**Frontend:**
- react 18.3.1, react-dom 18.3.1
- vite 7.2.4
- typescript
- @mysten/dapp-kit, @mysten/sui (installed, ready for full integration)
- @tanstack/react-query (installed)

**Backend:**
- @mysten/sui
- typescript, tsx

## Known Issues & Roadmap
- ✅ UI/UX complete with full game flow
- ✅ Wallet connection modal ready
- ⏳ Real Sui dApp Kit integration (next)
- ⏳ Blockchain interaction via MajorityRulesClient
- ⏳ Leaderboard functionality
- ⏳ Multi-network support (testnet/mainnet toggle)

## Deployment Ready
The app is ready to publish to production with:
- Static frontend deployment (Vite build)
- Environment variables for network configuration
- Wallet connection for production networks

## User Preferences Implemented
✓ Modern clean UI (dark theme, bright accents)
✓ Glassmorphism effects
✓ Smooth animations and transitions
✓ Fast iteration and responsive design
✓ Sui dApp Kit integration path confirmed with OneChain

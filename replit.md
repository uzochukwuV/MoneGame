# Majority Rules - OneChain Battle Royale Game

## Overview
A blockchain-based battle royale game where players vote on questions and the majority wins. Survive 3 elimination rounds and split the prize pool with fellow survivors. Built on OneChain (Sui-based) with OneWallet integration.

## Project Type
Full-stack application with:
- **Frontend**: React + Vite + TypeScript web application
- **Backend SDK**: TypeScript library for blockchain interaction

## Recent Changes (November 27, 2025)
- Created complete React + Vite + TypeScript frontend
- Implemented modern dark theme UI with glassmorphism effects (inspired by yellow.network/reactive.network)
- Built OneWallet integration for OneChain blockchain connectivity
- Created all game flow components: Hero, TierSelection, GameLobby, ActiveGame, GameResults, HowToPlay
- Configured Vite for Replit environment (port 5000, host 0.0.0.0, allow all hosts)
- Migrated backend SDK from deprecated `@mysten/sui.js` to `@mysten/sui`

## Project Architecture

### Core Structure
```
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── Header.tsx
│   │   │   ├── TierSelection.tsx
│   │   │   ├── GameLobby.tsx
│   │   │   ├── ActiveGame.tsx
│   │   │   ├── GameResults.tsx
│   │   │   └── HowToPlay.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useOneWallet.ts
│   │   │   └── useGameState.ts
│   │   ├── types/             # TypeScript types
│   │   │   └── game.ts
│   │   ├── App.tsx            # Main application component
│   │   ├── index.css          # Global styles
│   │   └── main.tsx           # Entry point
│   ├── vite.config.ts         # Vite configuration
│   └── package.json           # Frontend dependencies
├── game_onchain/src/          # Backend client library
│   ├── client.ts              # MajorityRulesClient - main game client
│   ├── sponsor.ts             # GasSponsor - gas sponsorship system
│   ├── types.ts               # TypeScript type definitions
│   └── index.ts               # Public exports
└── package.json               # Root dependencies
```

### Frontend Components

1. **Header** - Navigation bar with wallet connection
2. **TierSelection** - Choose game entry tier (0.01-100 OCT)
3. **GameLobby** - Wait for players and game start
4. **ActiveGame** - Ask questions, vote, and see results
5. **GameResults** - Final standings and prize claiming
6. **HowToPlay** - Game rules and mechanics

### Backend SDK (MajorityRulesClient)
- Main client for interacting with the battle royale game
- Supports gasless transactions via sponsor system
- Provides game lifecycle methods: create, join, start, ask questions, submit answers, finalize rounds, claim prizes
- Includes view functions for querying game state

### Game Tiers
- TIER_1: 0.01 OCT entry fee
- TIER_2: 0.1 OCT entry fee
- TIER_3: 1 OCT entry fee
- TIER_4: 10 OCT entry fee
- TIER_5: 100 OCT entry fee

### Network Configuration
- Default Testnet RPC: `https://rpc-testnet.onelabs.cc:443`
- Default Mainnet RPC: `https://rpc-mainnet.onelabs.cc:443`

## UI Design
- **Theme**: Dark mode (#0a0a0f background)
- **Accents**: Purple/cyan gradient (#7c3aed → #06b6d4)
- **Effects**: Glassmorphism cards, smooth animations
- **Fonts**: Space Grotesk (headings), Inter (body)
- **Style Reference**: yellow.network, reactive.network

## Running the Project

### Current Workflow
The workflow "Majority Rules Game" runs the React frontend:
```bash
cd client && npm run dev
```
Frontend runs on port 5000.

### Dependencies
**Frontend (client/):**
- react, react-dom
- vite
- typescript
- tailwind CSS (via PostCSS)

**Backend (game_onchain/):**
- @mysten/sui
- dotenv
- typescript, tsx

## Environment Setup

### Required Secrets
- `SEED`: Sui wallet mnemonic/seed phrase (stored in Replit Secrets)

## Development Notes

### OneWallet Integration
The frontend uses OneWallet for OneChain connectivity:
- `useOneWallet` hook manages wallet connection state
- Handles connect/disconnect, installation guidance
- Provides address and balance information

### Gas Sponsorship Model
The game uses a unique gasless transaction model:
- Sponsor pays gas fees for game actions
- Players only pay entry fees to join games
- Prize claiming is paid by the winner

### Future Improvements
1. Replace simulated game state with real MajorityRulesClient interactions
2. Add cleanup for outstanding setTimeout timers
3. Extend OneWallet hook for provider events (account/network changes)
4. Connect to live OneChain testnet/mainnet

## User Preferences
- Modern, clean UI similar to yellow.network/reactive.network
- OneWallet integration (not standard Sui wallet)
- Dark theme with bright gradient accents

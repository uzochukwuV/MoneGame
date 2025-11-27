# Majority Rules - OneChain Battle Royale Game

## Overview
A blockchain-based battle royale game where players vote on questions and the majority wins. Survive 3 elimination rounds and split the prize pool with fellow survivors. Built on OneChain (Sui-based) with wallet integration for blockchain interactions.

## Project Type
Full-stack application with:
- **Frontend**: React + Vite + TypeScript web application
- **Backend SDK**: TypeScript library for blockchain interaction

## Recent Changes (November 27, 2025)
- Downgraded React from 19 to 18 for compatibility with libraries
- Removed complex dApp Kit provider setup due to React version conflicts
- Simplified wallet integration to basic state management (ConnectButton placeholder)
- Fixed undefined state error in App component
- Frontend now renders successfully with clean dark theme UI

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

1. **Header** - Navigation bar with wallet connection button
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
- react (18.3.1), react-dom (18.3.1)
- vite
- typescript
- tailwind CSS (via PostCSS)
- @mysten/dapp-kit (installed but not used in providers due to compatibility)
- @mysten/sui (for blockchain interaction)
- @tanstack/react-query (installed but not used in providers)

**Backend (game_onchain/):**
- @mysten/sui
- dotenv
- typescript, tsx

## Environment Setup

### Required Secrets
- `SEED`: Sui wallet mnemonic/seed phrase (stored in Replit Secrets)

## Development Notes

### Current Wallet Integration Status
- Using basic state management for wallet connection (ConnectButton placeholder)
- Ready to integrate with Sui dApp Kit once React/provider compatibility issues are resolved
- Can be extended to support real wallet connection via OneWallet or Sui Wallet

### Gas Sponsorship Model
The game uses a unique gasless transaction model:
- Sponsor pays gas fees for game actions
- Players only pay entry fees to join games
- Prize claiming is paid by the winner

### Next Steps for Wallet Integration
1. Implement proper ConnectButton click handler to integrate with Sui dApp Kit
2. Add useCurrentAccount hook back when React 18 compatibility is confirmed
3. Connect to live OneChain testnet/mainnet for real transactions
4. Replace simulated game state with real MajorityRulesClient interactions

## User Preferences
- Modern, clean UI similar to yellow.network/reactive.network
- Wallet integration via Sui dApp Kit (not OneWallet which redirects to website)
- Dark theme with bright gradient accents
- Fast iteration and responsive UI

## Known Issues & Technical Debt
1. React 18 downgrade from 19 for dApp Kit compatibility
2. Wallet connection currently placeholder - needs real Sui dApp Kit integration
3. Game logic uses simulated state - needs connection to MajorityRulesClient
4. Unused packages: @tanstack/react-query, @mysten/dapp-kit (installed for future use)

## Future Improvements
1. Complete Sui dApp Kit integration for real wallet connectivity
2. Connect frontend to MajorityRulesClient for blockchain interactions
3. Add cleanup for outstanding setTimeout timers
4. Implement leaderboard functionality
5. Add support for multiple networks (testnet/mainnet)

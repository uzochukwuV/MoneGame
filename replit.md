# Sui Blockchain Game - "Majority Rules"

## Overview
This is a TypeScript-based Sui blockchain game client library that implements a battle royale-style game with gas sponsorship features. The project provides a client SDK for interacting with on-chain smart contracts deployed on the Sui blockchain.

## Project Type
Backend/CLI application - This is a TypeScript library and script collection for blockchain interaction, not a web frontend.

## Recent Changes (November 27, 2025)
- Migrated from deprecated `@mysten/sui.js` package to `@mysten/sui`
- Updated all Transaction API calls to use new syntax:
  - `TransactionBlock` → `Transaction`
  - `tx.pure()` → `tx.pure.string()`, `tx.pure.u8()`, `tx.pure.vector()`, `tx.pure.address()`
  - `signAndExecuteTransactionBlock` → `signAndExecuteTransaction`
  - `signTransactionBlock` → `signTransaction`
  - Parameter names updated: `transactionBlock` → `transaction` (except for devInspect methods)
- Configured Replit workflow to run the payment splitter demo script
- Set up SEED environment secret for blockchain keypair derivation

## Project Architecture

### Core Structure
```
├── game_onchain/src/          # Main client library
│   ├── client.ts              # MajorityRulesClient - main game client
│   ├── sponsor.ts             # GasSponsor - gas sponsorship system
│   ├── types.ts               # TypeScript type definitions
│   └── index.ts               # Public exports
├── call_split_payment.ts      # Payment splitter demo script
├── example.ts                 # Full game flow example
└── package.json               # Dependencies and scripts
```

### Key Components

1. **MajorityRulesClient** (`game_onchain/src/client.ts`)
   - Main client for interacting with the battle royale game
   - Supports gasless transactions via sponsor system
   - Provides game lifecycle methods: create, join, start, ask questions, submit answers, finalize rounds, claim prizes
   - Includes view functions for querying game state

2. **GasSponsor** (`game_onchain/src/sponsor.ts`)
   - Implements gas sponsorship for user transactions
   - Allows a sponsor account to pay gas fees while users only pay entry fees
   - Configurable max gas budget per transaction

3. **Game Tiers** (`game_onchain/src/types.ts`)
   - TIER_1: 0.01 OCT entry fee
   - TIER_2: 0.1 OCT entry fee
   - TIER_3: 1 OCT entry fee
   - TIER_4: 10 OCT entry fee
   - TIER_5: 100 OCT entry fee

### Network Configuration
- Default Testnet RPC: `https://rpc-testnet.onelabs.cc:443`
- Default Mainnet RPC: `https://rpc-mainnet.onelabs.cc:443`
- Custom RPC URLs can be configured via GameConfig

## Environment Setup

### Required Secrets
- `SEED`: Sui wallet mnemonic/seed phrase for deriving keypairs (stored in Replit Secrets)

### Dependencies
- `@mysten/sui`: Sui blockchain SDK
- `dotenv`: Environment variable management
- `typescript`: TypeScript compiler
- `tsx`: TypeScript execution runtime
- `@types/node`: Node.js type definitions

## Running the Project

### Available Scripts
- `npm run dev`: Runs the payment splitter demo (`call_split_payment.ts`)

### Current Workflow
The workflow "Run Sui Game Script" executes the payment splitter demo, which:
1. Derives a keypair from the SEED environment variable
2. Connects to Sui testnet
3. Executes a payment split transaction on-chain
4. Outputs the transaction digest on success

### Example Usage
The `example.ts` file demonstrates a complete game flow:
- Creating a game with gas sponsorship
- Joining a game (gasless)
- Starting the game (gasless)
- Asking questions (gasless)
- Submitting answers (gasless)
- Finalizing rounds (gasless)
- Claiming prizes (user pays gas for receiving funds)

## Development Notes

### Migration from @mysten/sui.js
The project has been updated to use the new `@mysten/sui` package. Key API changes:
- Transaction builder uses typed methods for pure values
- Method names have been streamlined
- BCS encoding is now explicit for type safety

### Gas Sponsorship Model
The game uses a unique gasless transaction model where:
- Sponsor pays gas fees for game actions
- Players only pay entry fees to join games
- Prize claiming is paid by the winner (since they're receiving funds)
- Maximum gas budget per transaction is configurable (default: 0.05 OCT)

## User Preferences
None specified yet.

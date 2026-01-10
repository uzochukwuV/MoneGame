# Gas Sponsorship Guide

This document explains how gas sponsorship works in the OneChain game frontend and how to set it up.

## Overview

Gas sponsorship allows the platform to pay for users' transaction fees, removing friction from the gaming experience. Users can play without needing to hold OCT tokens for gas.

## How It Works

1. **User initiates action** (e.g., join game, submit answer)
2. **Frontend builds transaction** using `useGameActionsWithSponsor` hook
3. **Transaction sent to sponsor endpoint** (`/api/sponsor`)
4. **Backend signs with sponsor wallet** (pays for gas)
5. **Signed transaction returned to frontend**
6. **Frontend submits to OneChain network**

## Architecture

```
┌─────────────┐
│   User UI   │
└──────┬──────┘
       │ 1. Build transaction
       ▼
┌──────────────────────┐
│ useGameActionsWithSponsor │
└──────┬───────────────┘
       │ 2. Send to sponsor
       ▼
┌──────────────────┐
│ /api/sponsor     │
│ (Next.js API)    │
└──────┬───────────┘
       │ 3. Sign with sponsor wallet
       ▼
┌──────────────────┐
│ OneChain Network │
└──────────────────┘
```

## Setup Instructions

### 1. Create Sponsor Wallet

First, create a new wallet that will sponsor gas fees:

```bash
# Using Sui CLI
sui client new-address ed25519

# This will output:
# - Address: 0x...
# - Secret Recovery Phrase: [12 words]
```

**Important**: Save the secret recovery phrase securely!

### 2. Export Private Key

```bash
# Export the private key in base64 format
sui keytool export --key-identity <sponsor-address>

# This will output a base64 encoded private key
```

### 3. Fund Sponsor Wallet

Transfer OCT tokens to the sponsor wallet address. The amount depends on your expected usage:

- **Development**: 10-50 OCT
- **Production**: 500+ OCT (monitor regularly)

### 4. Configure Environment Variables

Create `.env.local` file in the `frontend/` directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:

```env
# Enable gas sponsorship
NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED=true

# Sponsor wallet private key (base64 encoded)
SPONSOR_PRIVATE_KEY=<your_base64_private_key_here>
```

**Security Notes**:
- Never commit `.env.local` to version control
- Rotate the sponsor key regularly
- Monitor sponsor wallet balance
- Set up alerts for low balance

### 5. Test the Setup

```bash
# Start the development server
npm run dev

# Check sponsor health
curl http://localhost:3000/api/sponsor

# Expected response:
{
  "status": "operational",
  "sponsor": "0x...",
  "balance": {
    "total": "10000000000",
    "formatted": "10.00 OCT"
  },
  "timestamp": "2024-01-10T..."
}
```

## Usage in Code

### Basic Usage

```typescript
import { useGameActionsWithSponsor } from '@/hooks/useGameActionsWithSponsor';

function MyComponent() {
  const { createGame } = useGameActionsWithSponsor();

  const handleCreateGame = async () => {
    try {
      // Transaction is automatically sponsored
      const digest = await createGame(tier, paymentCoinId);
      console.log('Game created:', digest);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  return <button onClick={handleCreateGame}>Create Game</button>;
}
```

### Check Sponsorship Status

```typescript
import { useGasSponsor } from '@/hooks/useGasSponsor';

function SponsorStatus() {
  const { isSponsored, checkSponsorHealth } = useGasSponsor();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkSponsorHealth().then(setHealth);
  }, []);

  return (
    <div>
      <p>Gas Sponsorship: {isSponsored ? 'Enabled' : 'Disabled'}</p>
      {health && (
        <p>Sponsor Balance: {health.balance}</p>
      )}
    </div>
  );
}
```

## Fallback Behavior

If gas sponsorship fails (sponsor out of funds, network error, etc.), the hook will **fall back to user-paid gas**. This ensures the app remains functional even if sponsorship is unavailable.

To implement user-paid gas fallback, you'll need to integrate with the wallet's signing:

```typescript
// In useGasSponsor.ts - executeWithUserGas function
const { mutate: signAndExecute } = useSignAndExecuteTransaction();

const executeWithUserGas = async (tx: Transaction) => {
  return new Promise((resolve, reject) => {
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => resolve({
          digest: result.digest,
          effects: result.effects,
          sponsored: false,
        }),
        onError: reject,
      }
    );
  });
};
```

## Monitoring

### Check Sponsor Balance

```bash
# Using Sui CLI
sui client gas --address <sponsor-address>
```

### Monitor Gas Usage

Track gas consumption in your backend logs:

```typescript
// In /api/sponsor/route.ts
console.log('Gas Sponsorship Request:', {
  sender,
  sponsor: sponsorAddress,
  timestamp: new Date().toISOString(),
});
```

### Set Up Alerts

Consider setting up monitoring for:
- Sponsor wallet balance < 100 OCT
- Failed sponsorship requests
- High gas consumption rate

## Security Considerations

1. **Private Key Security**
   - Store in environment variables only
   - Never expose in frontend code
   - Rotate keys regularly
   - Use different keys for dev/prod

2. **Rate Limiting**
   - Implement rate limits per user
   - Prevent spam attacks
   - Monitor for unusual patterns

3. **Transaction Validation**
   - Validate transaction types
   - Whitelist allowed contract methods
   - Set gas budget limits

4. **Access Control**
   - Consider IP allowlists for production
   - Implement authentication if needed
   - Log all sponsorship requests

## Cost Optimization

Average gas costs:
- `create_game`: ~0.001 OCT
- `join_game`: ~0.001 OCT
- `submit_answer`: ~0.0005 OCT
- `finalize_round`: ~0.002 OCT

**Daily costs estimate**:
- 100 games/day: ~0.5 OCT
- 1000 games/day: ~5 OCT

## Troubleshooting

### "SPONSOR_PRIVATE_KEY environment variable not set"

- Ensure `.env.local` exists in `frontend/` directory
- Check that `SPONSOR_PRIVATE_KEY` is set
- Restart Next.js dev server

### "Invalid SPONSOR_PRIVATE_KEY format"

- Private key must be base64 encoded
- Export using: `sui keytool export --key-identity <address>`
- Check for extra whitespace or newlines

### "Insufficient balance for gas"

- Check sponsor wallet balance
- Fund the wallet with more OCT
- Consider increasing gas budget

### Sponsorship fails but no error

- Check backend logs in terminal
- Verify sponsor endpoint is running
- Test health check: `curl http://localhost:3000/api/sponsor`

## Production Deployment

For production deployments (Vercel, etc.):

1. Add `SPONSOR_PRIVATE_KEY` to environment variables in hosting platform
2. Enable `NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED=true`
3. Use production RPC endpoint
4. Set up monitoring and alerts
5. Implement rate limiting
6. Regular security audits

## Alternative: Disable Gas Sponsorship

To disable gas sponsorship and require users to pay gas:

```env
NEXT_PUBLIC_GAS_SPONSORSHIP_ENABLED=false
```

All hooks will work normally, but users will need to:
- Have OCT tokens in their wallet
- Approve transactions in wallet extension
- Pay for their own gas fees


just move to wallet connect, you can see in this file it is imported from dapp-kit, then we can start the ui - (frontend/
├── app/
│   ├── layout.tsx                 # Root layout (Header/Footer)
│   ├── page.tsx                   # Home page (/)
│   │
│   ├── game/
│   │   └── [gameId]/
│   │       ├── page.tsx           # Active game (/game/:id)
│   │       └── lobby/
│   │           └── page.tsx       # Lobby (/game/:id/lobby)
│   │
│   ├── discover/
│   │   └── [tier]/
│   │       └── page.tsx           # Discovery (/discover/:tier)
│   │
│   ├── stats/
│   │   └── page.tsx               # Player stats (/stats)
│   │
│   ├── history/
│   │   └── page.tsx               # Game history (/history)
│   │
│   ├── leaderboard/
│   │   └── page.tsx               # Leaderboard (/leaderboard)
│   │
│   ├── how-to-play/
│   │   └── page.tsx               # Tutorial (/how-to-play)
│   │
│   └── api/                       # ⭐ Backend for gas sponsorship!
│       ├── sponsor/
│       │   └── route.ts           # POST /api/sponsor
│       └── games/
│           └── route.ts           # GET /api/games (cached)
│
├── components/
│   ├── game/
│   ├── stats/
│   ├── common/
│   └── layout/
│
├── hooks/
│   ├── useGameActions.ts
│   ├── useGasSponsor.ts
│   └── useZkLogin.ts
│
├── lib/
│   ├── sui.ts                     # Sui client setup
│   ├── constants.ts
│   └── utils.ts
│
├── store/
│   └── gameStore.ts               # Zustand store
│
└── styles/
    └── globals.css)
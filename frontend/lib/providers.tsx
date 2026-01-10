'use client';

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { RPC_ENDPOINTS, SUI_NETWORK } from './constants';

/**
 * Root providers for the Next.js application
 *
 * Sets up:
 * - React Query for data fetching
 * - Sui Client Provider for blockchain connection
 * - Wallet Provider for wallet management
 */

const networks = {
  testnet: { url: RPC_ENDPOINTS.testnet },
  mainnet: { url: RPC_ENDPOINTS.mainnet },
};

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient with useState to ensure it's only created once per client
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networks}
        defaultNetwork={SUI_NETWORK as 'testnet' | 'mainnet'}
      >
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

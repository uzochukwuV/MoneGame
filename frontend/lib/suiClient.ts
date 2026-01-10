import { SuiClient } from '@mysten/sui/client';
import { RPC_ENDPOINTS, SUI_NETWORK } from './constants';

/**
 * Get Sui Client instance for OneChain network
 */
export function getSuiClient(): SuiClient {
  const url = RPC_ENDPOINTS[SUI_NETWORK as keyof typeof RPC_ENDPOINTS];

  return new SuiClient({
    url,
  });
}

// Export singleton instance
export const suiClient = getSuiClient();

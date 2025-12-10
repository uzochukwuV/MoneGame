import { useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { MajorityRulesClient } from '../../../game_onchain/src';
import type { GameConfig } from '../../../game_onchain/src';

export function useGameClient(packageId: string) {
  const currentAccount = useCurrentAccount();

  const gameClient = useMemo(() => {
    const config: GameConfig = {
      network: 'testnet',
      packageId,
    };

    return new MajorityRulesClient(config);
  }, [packageId]);

  return {
    client: gameClient,
    account: currentAccount,
    isConnected: !!currentAccount,
  };
}

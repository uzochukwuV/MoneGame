import { useState, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    oneWallet?: {
      connect: () => Promise<{ address: string }>;
      disconnect: () => Promise<void>;
      signAndExecuteTransaction: (params: { transaction: any }) => Promise<{ digest: string }>;
      signTransaction: (params: { transaction: any }) => Promise<{ signature: string; bytes: Uint8Array }>;
      getAccount: () => Promise<{ address: string } | null>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      off?: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  balance?: string;
}

export interface TransactionResult {
  digest: string;
  signature?: string;
  bytes?: Uint8Array;
}

export function useOneWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isConnecting: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && window.oneWallet) {
      try {
        const account = await window.oneWallet.getAccount();
        if (account) {
          setWalletState({
            isConnected: true,
            address: account.address,
            isConnecting: false,
            error: null,
          });
        }
      } catch (err) {
        console.log('No existing wallet connection');
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') {
      setWalletState(prev => ({
        ...prev,
        error: 'Window not available',
      }));
      return;
    }

    if (!window.oneWallet) {
      setWalletState(prev => ({
        ...prev,
        error: 'OneWallet not installed. Please install OneWallet extension.',
      }));
      window.open('https://onelabs.cc/wallet', '_blank');
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const { address } = await window.oneWallet.connect();
      setWalletState({
        isConnected: true,
        address,
        isConnecting: false,
        error: null,
      });
    } catch (err: any) {
      setWalletState({
        isConnected: false,
        address: null,
        isConnecting: false,
        error: err.message || 'Failed to connect wallet',
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (window.oneWallet) {
      try {
        await window.oneWallet.disconnect();
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
    
    setWalletState({
      isConnected: false,
      address: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  const signAndExecuteTransaction = useCallback(async (transaction: any): Promise<TransactionResult> => {
    if (!window.oneWallet) {
      throw new Error('OneWallet not installed');
    }

    if (!walletState.isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      const result = await window.oneWallet.signAndExecuteTransaction({
        transaction,
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Transaction execution failed';
      setWalletState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw err;
    }
  }, [walletState.isConnected]);

  const signTransaction = useCallback(async (transaction: any) => {
    if (!window.oneWallet) {
      throw new Error('OneWallet not installed');
    }

    if (!walletState.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await window.oneWallet.signTransaction({
        transaction,
      });
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Transaction signing failed';
      setWalletState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw err;
    }
  }, [walletState.isConnected]);

  return {
    ...walletState,
    connect,
    disconnect,
    signAndExecuteTransaction,
    signTransaction,
  };
}

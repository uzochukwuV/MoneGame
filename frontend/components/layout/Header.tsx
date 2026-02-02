'use client';

import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HACKATHON_COIN_TYPE, TOKEN_SYMBOL } from '@/lib/constants';

export function Header() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!currentAccount?.address) {
        setBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        // Query specifically for HACKATHON tokens
        const coins = await suiClient.getCoins({
          owner: currentAccount.address,
          coinType: HACKATHON_COIN_TYPE,
        });

        if (coins.data && coins.data.length > 0) {
          const totalBalance = coins.data.reduce((sum, coin) => {
            const amount = Number(coin.balance) || 0;
            return sum + amount;
          }, 0);

          const balanceInToken = totalBalance / 1_000_000_000;
          setBalance(balanceInToken);
        } else {
          setBalance(0);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();

    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [currentAccount?.address, suiClient]);

  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ fontSize: '2rem', transition: 'transform 0.2s' }}>🎯</div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', letterSpacing: '-0.02em', margin: 0 }}>
                MAJORITY RULES
              </h1>
              <p style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                OneChain
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="hidden lg:flex">
            <Link href="/discover/1" style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }}>
              Discover
            </Link>
            <Link href="/leaderboard" style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }}>
              Leaderboard
            </Link>
            <Link href="/stats" style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }}>
              Stats
            </Link>
            <Link href="/history" style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }}>
              History
            </Link>
            <Link href="/how-to-play" style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }}>
              How to Play
            </Link>
          </nav>

          {/* Wallet Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentAccount && balance !== null && (
              <div className="hidden sm:flex" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Balance
                </span>
                <span style={{ color: '#10b981', fontWeight: '600', fontSize: '0.875rem' }}>
                  {isLoadingBalance ? (
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                  ) : (
                    `${balance.toFixed(2)} ${TOKEN_SYMBOL}`
                  )}
                </span>
              </div>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

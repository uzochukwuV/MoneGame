import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';

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
        console.log('💰 Fetching balance for:', currentAccount.address.slice(0, 8) + '...');
        const coins = await suiClient.getAllCoins({ owner: currentAccount.address });

        if (coins.data && coins.data.length > 0) {
          // Sum all coin balances
          const totalBalance = coins.data.reduce((sum, coin) => {
            const amount = Number(coin.balance) || 0;
            return sum + amount;
          }, 0);

          // Convert from MIST to OCT (1 OCT = 1 billion MIST)
          const balanceInOCT = totalBalance / 1_000_000_000;
          setBalance(balanceInOCT);
          console.log('✅ Balance fetched:', balanceInOCT.toFixed(2), 'OCT');
        } else {
          setBalance(0);
        }
      } catch (error) {
        console.error('❌ Failed to fetch balance:', error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [currentAccount?.address, suiClient]);

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon">&#x1F3AE;</span>
          <h1>MAJORITY RULES</h1>
        </div>

        <nav className="nav-links">
          <a href="#play" className="nav-link">Play</a>
          <a href="#leaderboard" className="nav-link">Leaderboard</a>
          <a href="#rules" className="nav-link">How to Play</a>
        </nav>

        <div className="wallet-section">
          {currentAccount && balance !== null && (
            <div className="balance-display">
              <span className="balance-label">Balance:</span>
              <span className="balance-amount">
                {isLoadingBalance ? (
                  <span className="loading-spinner">⟳</span>
                ) : (
                  `${balance.toFixed(2)} OCT`
                )}
              </span>
            </div>
          )}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}

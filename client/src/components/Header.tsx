import { useState } from 'react';

interface HeaderProps {
  walletAddress: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({ walletAddress, isConnecting, onConnect, onDisconnect }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
          {walletAddress ? (
            <div className="wallet-connected">
              <button 
                className="wallet-button connected"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="wallet-icon">&#x1F4B3;</span>
                {formatAddress(walletAddress)}
              </button>
              {showDropdown && (
                <div className="wallet-dropdown">
                  <button onClick={onDisconnect} className="disconnect-btn">
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="wallet-button"
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

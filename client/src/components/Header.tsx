interface HeaderProps {
  walletAddress?: string | null;
  onConnect?: () => void;
}

export function Header({ walletAddress, onConnect }: HeaderProps) {
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
            <button className="wallet-button" title={walletAddress}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </button>
          ) : (
            <button className="wallet-button" onClick={onConnect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

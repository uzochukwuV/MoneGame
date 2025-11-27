export function Header() {
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
          <button className="wallet-button">Connect Wallet</button>
        </div>
      </div>
    </header>
  );
}

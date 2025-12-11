interface GameResultsProps {
  gameInfo: any;
  address: any;
  isWinner: boolean;
  isEliminated: boolean;
  prizePool: number;
  survivors: string[];
  canClaimPrize: boolean;
  onClaimPrize: () => void;
  onPlayAgain: () => void;
  handleNextgame: () => void;
}

export function GameResults({
  gameInfo,
  address,
  isWinner,
  isEliminated,
  prizePool,
  survivors,
  canClaimPrize,
  onClaimPrize,
  onPlayAgain,
  handleNextgame

}: GameResultsProps) {
  const prizePerWinner = survivors.length > 0 ? prizePool / survivors.length : 0;
  const prizeInOCT = prizePerWinner / 1_000_000_000;


  if (gameInfo.eliminated.includes(address)){
    return <div>
      You have been eliminated
    </div>

  }

  if (gameInfo.status == 2) return (
    <div className="game-container">
      <div className="game-card">
        <div className="results-section">
          {isWinner ? (
            <>
              <div className="results-icon">&#x1F3C6;</div>
              <h2 className="results-title winner">You Won!</h2>
              <p className="results-subtitle">
                Congratulations! You survived all 3 rounds and earned your share of the prize pool.
              </p>
              
              <div className="prize-display">
                <span className="prize-amount">{prizeInOCT.toFixed(4)}</span>
                <span className="prize-currency">OCT</span>
              </div>

              {canClaimPrize && (
                <button className="claim-button" onClick={onClaimPrize}>
                  Claim Prize
                </button>
              )}
            </>
          ) : isEliminated ? (
            <>
              <div className="results-icon">&#x1F4A5;</div>
              <h2 className="results-title">Eliminated!</h2>
              <p className="results-subtitle">
                You were in the minority and got eliminated. Better luck next time!
              </p>
              
              <div style={{ 
                padding: '1.5rem', 
                background: 'var(--bg-glass)', 
                borderRadius: '16px',
                marginBottom: '2rem'
              }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {survivors.length} player{survivors.length !== 1 ? 's' : ''} survived this game
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Total prize pool: {(prizePool / 1_000_000_000).toFixed(4)} OCT
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="results-icon">&#x1F3AE;</div>
              <h2 className="results-title">Game Over</h2>
              <p className="results-subtitle">
                Thanks for playing! Check back for more games.
              </p>
            </>
          )}

          <button className="back-button" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );


  return <div>
    

     <button className="back-button" onClick={handleNextgame}>
            Next Session {gameInfo.current_round}
          </button>
  </div>
}

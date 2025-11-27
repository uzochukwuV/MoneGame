import { useCurrentAccount } from '@mysten/dapp-kit';
import { Header } from './components/Header';
import { TierSelection } from './components/TierSelection';
import { HowToPlay } from './components/HowToPlay';
import { GameLobby } from './components/GameLobby';
import { ActiveGame } from './components/ActiveGame';
import { GameResults } from './components/GameResults';
import { useGameState } from './hooks/useGameState';
import { Tier } from './types/game';

function App() {
  const currentAccount = useCurrentAccount();
  const { state, actions, isLoading, error } = useGameState();

  const handleSelectTier = async (tier: Tier) => {
    if (!currentAccount) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Try to find existing game or create new one
      await actions.createGame(tier);
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const handleAskQuestion = async (
    question: { question: string; optionA: string; optionB: string; optionC: string },
    myAnswer: 1 | 2 | 3
  ) => {
    try {
      await actions.askQuestion(
        question.question,
        question.optionA,
        question.optionB,
        question.optionC,
        myAnswer
      );
    } catch (err) {
      console.error('Failed to ask question:', err);
    }
  };

  const handleSubmitAnswer = async (choice: 1 | 2 | 3) => {
    try {
      await actions.submitAnswer(choice);
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  const handleClaimPrize = async () => {
    try {
      await actions.claimPrize();
      actions.leaveGame();
    } catch (err) {
      console.error('Failed to claim prize:', err);
    }
  };

  return (
    <>
      <Header />

      <main>
        {state.phase === 'home' && (
          <>
            <section className="hero">
              <div className="hero-badge">
                <span className="live-dot"></span>
                Live on Sui Testnet
              </div>
              
              <h1>
                Vote with the <span>Majority</span> or Get Eliminated
              </h1>
              
              <p className="hero-subtitle">
                A battle royale game where thinking like the crowd is your only strategy. 
                Survive 3 rounds and split the prize pool with fellow survivors.
              </p>

              <div className="hero-cta">
                <button className="btn-primary" onClick={() => document.getElementById('play')?.scrollIntoView({ behavior: 'smooth' })}>
                  Start Playing
                </button>
                <button className="btn-secondary" onClick={() => document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' })}>
                  How It Works
                </button>
              </div>

              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="hero-stat-value">2,847</div>
                  <div className="hero-stat-label">Games Played</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-value">15.2K</div>
                  <div className="hero-stat-label">SUI Distributed</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-value">8,432</div>
                  <div className="hero-stat-label">Players</div>
                </div>
              </div>
            </section>

            <TierSelection
              onSelectTier={handleSelectTier}
              walletConnected={!!currentAccount}
            />

            <HowToPlay />

            <footer>
              <div className="footer-content">
                <div className="footer-links">
                  <a href="https://docs.sui.io" target="_blank" rel="noopener noreferrer">Documentation</a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
                  <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">Discord</a>
                </div>
                <p className="footer-copyright">
                  &copy; 2025 Majority Rules. Built on Sui.
                </p>
              </div>
            </footer>
          </>
        )}

        {state.phase === 'lobby' && state.tier && (
          <GameLobby
            tier={state.tier}
            playerCount={state.playerCount}
            onLeave={actions.leaveGame}
          />
        )}

        {state.phase === 'active' && (
          <ActiveGame
            gameInfo={{
              gameId: state.gameId || '',
              tier: state.tier || Tier.TIER_1,
              status: state.status,
              currentRound: state.currentRound,
              playerCount: state.playerCount,
              eliminatedCount: state.eliminatedCount,
              prizePool: parseInt(state.prizePool) || 0,
              currentQuestioner: state.currentQuestioner,
              questionAsked: !!state.question,
            }}
            question={state.question ? {
              question: state.question.text,
              optionA: state.question.optionA,
              optionB: state.question.optionB,
              optionC: state.question.optionC,
            } : null}
            isQuestioner={state.isQuestioner}
            hasAnswered={state.hasAnswered}
            playerAnswer={state.playerAnswer}
            timeRemaining={60000} // TODO: Calculate from blockchain timestamp
            answerCount={(state.votingStats?.votesA || 0) + (state.votingStats?.votesB || 0) + (state.votingStats?.votesC || 0)}
            votingStats={state.votingStats ? {
              votesA: state.votingStats.votesA,
              votesB: state.votingStats.votesB,
              votesC: state.votingStats.votesC,
            } : null}
            onAskQuestion={handleAskQuestion}
            onSubmitAnswer={handleSubmitAnswer}
            onLeave={actions.leaveGame}
          />
        )}

        {state.phase === 'results' && state.tier && (
          <GameResults
            isWinner={!state.isEliminated}
            isEliminated={state.isEliminated}
            prizePool={parseInt(state.prizePool) || 0}
            survivors={state.survivors}
            canClaimPrize={state.canClaimPrize}
            onClaimPrize={handleClaimPrize}
            onPlayAgain={actions.leaveGame}
          />
        )}
      </main>

      {error && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '1rem 2rem',
          background: 'rgba(239, 68, 68, 0.9)',
          borderRadius: '12px',
          color: 'white',
          zIndex: 1000,
        }}>
          {error}
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '2rem',
          background: 'rgba(0, 0, 0, 0.9)',
          borderRadius: '16px',
          color: 'white',
          zIndex: 2000,
        }}>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p style={{ marginTop: '1rem' }}>Processing transaction...</p>
        </div>
      )}
    </>
  );
}

export default App;

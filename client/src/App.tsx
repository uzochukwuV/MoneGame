import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TierSelection } from './components/TierSelection';
import { HowToPlay } from './components/HowToPlay';
import { GameLobby } from './components/GameLobby';
import { ActiveGame } from './components/ActiveGame';
import { GameResults } from './components/GameResults';
import { Tier, GameStatus, TIER_FEES } from './types/game';
import type { GameInfo, Question, VotingStats } from './types/game';

type GamePhase = 'home' | 'lobby' | 'active' | 'results';

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const isConnected = !!address;
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnect = useCallback(() => {
    setShowWalletModal(true);
  }, []);

  const handleWalletSelect = useCallback((mockAddress: string) => {
    setAddress(mockAddress);
    setShowWalletModal(false);
  }, []);
  
  const [gamePhase, setGamePhase] = useState<GamePhase>('home');
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [playerAnswer, setPlayerAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60000);
  const [answerCount, setAnswerCount] = useState(0);
  const [votingStats, setVotingStats] = useState<VotingStats | null>(null);
  const [isEliminated, setIsEliminated] = useState(false);
  const [survivors, setSurvivors] = useState<string[]>([]);

  useEffect(() => {
    if (gamePhase === 'lobby' && gameInfo) {
      const interval = setInterval(() => {
        setGameInfo(prev => {
          if (!prev) return prev;
          const newCount = prev.playerCount + Math.floor(Math.random() * 3);
          if (newCount >= 10) {
            setTimeout(() => {
              setGamePhase('active');
              setGameInfo(prev => prev ? {
                ...prev,
                status: GameStatus.ACTIVE,
                currentRound: 1,
                currentQuestioner: address || '',
              } : null);
              setTimeRemaining(120000);
            }, 2000);
            return { ...prev, playerCount: Math.min(newCount, 25) };
          }
          return { ...prev, playerCount: newCount };
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [gamePhase, gameInfo, address]);

  useEffect(() => {
    if (gamePhase === 'active' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gamePhase, timeRemaining]);

  const handleSelectTier = useCallback((tier: Tier) => {
    if (!isConnected) {
      return;
    }

    setSelectedTier(tier);
    setGamePhase('lobby');
    setGameInfo({
      gameId: `game_${Date.now()}`,
      tier,
      status: GameStatus.WAITING,
      currentRound: 0,
      playerCount: Math.floor(Math.random() * 5) + 2,
      eliminatedCount: 0,
      prizePool: 0,
      currentQuestioner: '',
      questionAsked: false,
    });
  }, [isConnected]);

  const handleAskQuestion = useCallback((q: Question, myAnswer: 1 | 2 | 3) => {
    setQuestion(q);
    setHasAnswered(true);
    setPlayerAnswer(myAnswer);
    setTimeRemaining(60000);
    setAnswerCount(1);
    setGameInfo(prev => prev ? { ...prev, questionAsked: true } : null);
    
    setTimeout(() => {
      const totalPlayers = gameInfo?.playerCount || 10;
      const votesA = Math.floor(Math.random() * totalPlayers);
      const votesB = Math.floor(Math.random() * (totalPlayers - votesA));
      const votesC = totalPlayers - votesA - votesB;
      
      setVotingStats({ votesA, votesB, votesC });
      setAnswerCount(totalPlayers);
      
      const majority = votesA >= votesB && votesA >= votesC ? 1 : votesB >= votesC ? 2 : 3;
      if (myAnswer !== majority) {
        setIsEliminated(true);
      }
      
      setTimeout(() => {
        if (gameInfo && gameInfo.currentRound >= 3) {
          setGamePhase('results');
          setSurvivors([address || '']);
        } else {
          setGameInfo(prev => prev ? {
            ...prev,
            currentRound: prev.currentRound + 1,
            eliminatedCount: prev.eliminatedCount + Math.floor(prev.playerCount * 0.3),
          } : null);
          setQuestion(null);
          setHasAnswered(false);
          setPlayerAnswer(null);
          setVotingStats(null);
          setTimeRemaining(120000);
          setAnswerCount(0);
        }
      }, 5000);
    }, 8000);
  }, [gameInfo, address]);

  const handleSubmitAnswer = useCallback((choice: 1 | 2 | 3) => {
    setHasAnswered(true);
    setPlayerAnswer(choice);
    setAnswerCount(prev => prev + 1);
  }, []);

  const handleLeaveGame = useCallback(() => {
    setGamePhase('home');
    setSelectedTier(null);
    setGameInfo(null);
    setQuestion(null);
    setHasAnswered(false);
    setPlayerAnswer(null);
    setTimeRemaining(60000);
    setAnswerCount(0);
    setVotingStats(null);
    setIsEliminated(false);
    setSurvivors([]);
  }, []);

  const handleClaimPrize = useCallback(() => {
    console.log('Claiming prize...');
    handleLeaveGame();
  }, [handleLeaveGame]);

  const isQuestioner = gameInfo?.currentQuestioner === address;

  return (
    <>
      <Header walletAddress={address} onConnect={handleConnect} />

      <main>
        {gamePhase === 'home' && (
          <>
            <section className="hero">
              <div className="hero-badge">
                <span className="live-dot"></span>
                Live on OneChain Testnet
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
                  <div className="hero-stat-label">OCT Distributed</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-value">8,432</div>
                  <div className="hero-stat-label">Players</div>
                </div>
              </div>
            </section>

            <TierSelection
              onSelectTier={handleSelectTier}
              walletConnected={isConnected}
            />

            <HowToPlay />

            <footer>
              <div className="footer-content">
                <div className="footer-links">
                  <a href="https://docs.onelabs.cc" target="_blank" rel="noopener noreferrer">Documentation</a>
                  <a href="https://github.com/one-chain-labs" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://twitter.com/onechainlabs" target="_blank" rel="noopener noreferrer">Twitter</a>
                  <a href="https://discord.gg/onechain" target="_blank" rel="noopener noreferrer">Discord</a>
                </div>
                <p className="footer-copyright">
                  &copy; 2025 Majority Rules. Built on OneChain.
                </p>
              </div>
            </footer>
          </>
        )}

        {gamePhase === 'lobby' && selectedTier && gameInfo && (
          <GameLobby
            tier={selectedTier}
            playerCount={gameInfo.playerCount}
            onLeave={handleLeaveGame}
          />
        )}

        {gamePhase === 'active' && gameInfo && address && (
          <ActiveGame
            gameInfo={gameInfo}
            question={question}
            isQuestioner={isQuestioner}
            hasAnswered={hasAnswered}
            playerAnswer={playerAnswer}
            timeRemaining={timeRemaining}
            answerCount={answerCount}
            votingStats={votingStats}
            onAskQuestion={handleAskQuestion}
            onSubmitAnswer={handleSubmitAnswer}
            onLeave={handleLeaveGame}
          />
        )}

        {gamePhase === 'results' && selectedTier && (
          <GameResults
            isWinner={!isEliminated}
            isEliminated={isEliminated}
            prizePool={(gameInfo?.playerCount || 10) * TIER_FEES[selectedTier] * 1_000_000_000 * 0.95}
            survivors={survivors}
            canClaimPrize={!isEliminated}
            onClaimPrize={handleClaimPrize}
            onPlayAgain={handleLeaveGame}
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

      {showWalletModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#1a1a23',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '400px',
            border: '1px solid rgba(124, 58, 237, 0.2)',
          }}>
            <h2 style={{ color: '#fff', marginBottom: '1.5rem', textAlign: 'center' }}>
              Connect Wallet
            </h2>
            <p style={{ color: '#999', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Select a wallet to connect to OneChain Testnet
            </p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <button
                onClick={() => handleWalletSelect('0x' + '0'.repeat(64))}
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Demo Wallet
              </button>
              <button
                onClick={() => setShowWalletModal(false)}
                style={{
                  padding: '1rem',
                  background: 'transparent',
                  border: '1px solid rgba(124, 58, 237, 0.5)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '1.5rem', textAlign: 'center' }}>
              Real wallet integration coming soon
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Header } from './components/Header';
import { TierSelection } from './components/TierSelection';
import { HowToPlay } from './components/HowToPlay';
import { GameLobby } from './components/GameLobby';
import { ActiveGame } from './components/ActiveGame';
import { GameResults } from './components/GameResults';
import { Tier, GameStatus, TIER_FEES } from './types/game';
import type { GameInfo, Question, VotingStats } from './types/game';
import { GameDiscovery } from './components/GameDiscovery';
import { useGameDiscovery } from './hooks/useGameDiscovery';
import { useGameActions } from './hooks/useGameActions';
import { GAME_PACKAGE_ID } from './config/game';

type GamePhase = 'home' | 'discovery' | 'lobby' | 'active' | 'results';

function App() {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address || null;
  const isConnected = !!address;
  
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

  // Initialize game actions hook
  const gameActions = useGameActions({ packageId: GAME_PACKAGE_ID });

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

    console.log('🎯 [App] Tier selected:', tier);
    setSelectedTier(tier);
    // Go to discovery to check for games in this tier
    // Discovery will either show games to join or prompt to create
    setGamePhase('discovery');
  }, [isConnected]);

  const handleSelectGame = useCallback(async (gameId: string) => {
    if (!selectedTier || !gameActions) return;

    console.log('➡️ [App] User selected game:', gameId.slice(0, 8) + '...');

    try {
      // Call blockchain to join the game
      console.log('📤 [App] Calling joinGame on blockchain...');
      const txDigest = await gameActions.joinGame(gameId, selectedTier);
      console.log('✅ [App] Join transaction sent:', txDigest);

      // Fetch actual game data from blockchain
      const gameData = await gameActions.getGameInfo(gameId);

      if (gameData) {
        console.log('✅ [App] Game data fetched:', gameData);

        // Transform blockchain data to GameInfo format
        setGameInfo({
          gameId,
          tier: selectedTier,
          status: gameData.status,
          currentRound: gameData.currentRound,
          playerCount: gameData.players.length,
          eliminatedCount: gameData.eliminated.length,
          prizePool: Number(gameData.prizePool) / 1_000_000_000, // Convert MIST to OCT
          currentQuestioner: gameData.currentQuestioner,
          questionAsked: gameData.question?.text ? true : false,
        });

        setGamePhase('lobby');
      } else {
        console.error('❌ [App] Failed to fetch game data');
      }
    } catch (error) {
      console.error('❌ [App] Error joining game:', error);
    }
  }, [selectedTier, gameActions]);

  const handleCreateNewGame = useCallback(async () => {
    if (!selectedTier || !gameActions) return;

    console.log('🆕 [App] Creating new game for tier:', selectedTier);

    try {
      // Call blockchain to create game
      const txDigest = await gameActions.createGame(selectedTier);
      console.log('📤 [App] Create game transaction sent:', txDigest);

      // Fetch the newly created game to get its ID
      // Note: There's a small delay before the event is indexed
      // For now, we'll wait a moment then try to get the latest game
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get game info after creation
      // In production, you'd query for the game ID from the transaction result
      // For now, we fetch the game from discovery to get the latest
      console.log('⏳ [App] Waiting for game to be indexed...');
      // This is a simplified approach - in production, parse the transaction result for game ID

      // Fetch updated game list from discovery and find the newest one
      // For MVP, navigate to discovery which will refresh and show the new game
      setGamePhase('discovery');
      console.log('✅ [App] Game created! Refreshing discovery...');
    } catch (error) {
      console.error('❌ [App] Error creating game:', error);
    }
  }, [selectedTier, gameActions]);

  const handleCancelDiscovery = useCallback(() => {
    console.log('❌ [App] Cancelled game discovery, returning home');
    setGamePhase('home');
    setSelectedTier(null);
  }, []);

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
      <Header />

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

        {gamePhase === 'discovery' && selectedTier && (
          <GameDiscovery
            tier={selectedTier}
            onSelectGame={handleSelectGame}
            onCreateNew={handleCreateNewGame}
            onCancel={handleCancelDiscovery}
          />
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

    </>
  );
}

export default App;

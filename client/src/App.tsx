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

  // Helper: Save active game session to localStorage
  const saveGameSession = useCallback((gameId: string, tier: Tier) => {
    const session = {
      gameId,
      tier,
      userAddress: address,
      joinedAt: Date.now(),
    };
    localStorage.setItem('activeGameSession', JSON.stringify(session));
    console.log('💾 [App] Game session saved:', gameId.slice(0, 8) + '...');
  }, [address]);

  // Helper: Clear active game session from localStorage
  const clearGameSession = useCallback(() => {
    localStorage.removeItem('activeGameSession');
    console.log('🗑️ [App] Game session cleared');
  }, []);

  // Check for active game session on wallet connection
  useEffect(() => {
    const checkActiveGame = async () => {
      if (!isConnected || !gameActions) return;

      console.log('🔍 [App] Checking for active game session...');

      try {
        const sessionData = localStorage.getItem('activeGameSession');
        if (!sessionData) {
          console.log('✅ [App] No active game session found');
          return;
        }

        const session = JSON.parse(sessionData);
        console.log('📦 [App] Found session:', session.gameId.slice(0, 8) + '...');

        // Verify the session belongs to current user
        if (session.userAddress !== address) {
          console.log('❌ [App] Session user mismatch, clearing');
          clearGameSession();
          return;
        }

        // Verify game still exists and user is in it
        const gameData = await gameActions.getGameInfo(session.gameId);
        if (!gameData) {
          console.log('❌ [App] Game not found on blockchain, clearing session');
          clearGameSession();
          return;
        }

        // Check if user is still in the game
        const isPlayerInGame = gameData.players.includes(address!);
        const isPlayerEliminated = gameData.eliminated.includes(address!);

        if (!isPlayerInGame) {
          console.log('❌ [App] Player not in game, clearing session');
          clearGameSession();
          return;
        }

        console.log('✅ [App] Active game found! Rejoining...');
        console.log('   - Game ID:', session.gameId.slice(0, 8) + '...');
        console.log('   - Status:', gameData.status);
        console.log('   - Player Count:', gameData.players.length);
        console.log('   - Eliminated:', isPlayerEliminated);

        // Restore game state
        setSelectedTier(session.tier);
        setGameInfo({
          gameId: session.gameId,
          tier: session.tier,
          status: gameData.status,
          currentRound: gameData.currentRound,
          playerCount: gameData.players.length,
          eliminatedCount: gameData.eliminated.length,
          prizePool: Number(gameData.prizePool) / 1_000_000_000,
          currentQuestioner: gameData.currentQuestioner,
          questionAsked: gameData.question?.text ? true : false,
        });

        // Redirect to appropriate phase
        if (gameData.status === GameStatus.WAITING) {
          console.log('📍 [App] Redirecting to lobby (game waiting)');
          setGamePhase('lobby');
        } else if (gameData.status === GameStatus.ACTIVE) {
          console.log('📍 [App] Redirecting to active game');
          setGamePhase('active');
        } else if (gameData.status === GameStatus.FINISHED) {
          if (isPlayerEliminated) {
            console.log('📍 [App] Redirecting to results (player eliminated)');
            setIsEliminated(true);
          } else {
            console.log('📍 [App] Redirecting to results (game finished)');
          }
          setGamePhase('results');
        }
      } catch (error) {
        console.error('❌ [App] Error checking active game:', error);
        clearGameSession();
      }
    };

    checkActiveGame();
  }, [isConnected, address, gameActions, clearGameSession]);

  // Handler for when GameLobby detects game start
  const handleGameStart = useCallback((gameData: any) => {
    console.log('🎮 [App] GameLobby notified of game start');
    console.log('   - Players:', gameData.playerCount);
    console.log('   - Status:', gameData.status);

    // Update game info with fresh data from GameLobby
    setGameInfo(prev => prev ? {
      ...prev,
      status: gameData.status,
      currentRound: gameData.currentRound,
      playerCount: gameData.playerCount,
      eliminatedCount: gameData.eliminatedCount,
      prizePool: Number(gameData.prizePool) / 1_000_000_000,
      currentQuestioner: gameData.currentQuestioner,
      questionAsked: gameData.question?.text ? true : false,
    } : null);

    // Transition to active phase
    console.log('✅ [App] Transitioning to active game phase');
    setGamePhase('active');
    setTimeRemaining(120000);
  }, []);

  // Poll game data during active phase
  useEffect(() => {
    if (gamePhase === 'active' && gameInfo?.gameId && gameActions) {
      console.log('🎮 [App] Starting active game polling for game:', gameInfo.gameId.slice(0, 8) + '...');

      const pollActiveGame = async () => {
        try {
          // Fetch fresh game data from blockchain
          const gameData = await gameActions.getGameInfo(gameInfo.gameId);

          if (gameData) {
            const playerCount = gameData.players.length;
            const eliminatedCount = gameData.eliminated.length;

            console.log('📊 [App] Active game poll - Questioner:', gameData.currentQuestioner?.slice(0, 8) + '...', 'Question Asked:', gameData.question?.text ? 'Yes' : 'No');

            // Update game info with fresh blockchain data
            setGameInfo(prev => prev ? {
              ...prev,
              status: gameData.status,
              currentRound: gameData.currentRound,
              playerCount,
              eliminatedCount,
              prizePool: Number(gameData.prizePool) / 1_000_000_000,
              currentQuestioner: gameData.currentQuestioner,
              questionAsked: gameData.question?.text ? true : false,
            } : null);

            // If question was asked and we haven't shown it yet, update the question
            if (gameData.question?.text && !question) {
              console.log('✅ [App] Question received from blockchain!');
              setQuestion({
                question: gameData.question.text,
                optionA: gameData.question.option_a || '',
                optionB: gameData.question.option_b || '',
                optionC: gameData.question.option_c || '',
              });
            }

            // Check if game finished
            if (gameData.status === GameStatus.FINISHED) {
              console.log('✅ [App] Game finished! Transitioning to results...');
              setGamePhase('results');
            }
          }
        } catch (error) {
          console.error('❌ [App] Error polling active game:', error);
        }
      };

      // Poll immediately on mount, then every 1.5 seconds
      pollActiveGame();
      const interval = setInterval(pollActiveGame, 1500);

      return () => clearInterval(interval);
    }
  }, [gamePhase, gameInfo?.gameId, gameActions, question]);

  // Timer for active game
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
        const gameInfo = {
          gameId,
          tier: selectedTier,
          status: gameData.status,
          currentRound: gameData.currentRound,
          playerCount: gameData.players.length,
          eliminatedCount: gameData.eliminated.length,
          prizePool: Number(gameData.prizePool) / 1_000_000_000, // Convert MIST to OCT
          currentQuestioner: gameData.currentQuestioner,
          questionAsked: gameData.question?.text ? true : false,
        };

        setGameInfo(gameInfo);
        // Save game session to localStorage for persistence
        saveGameSession(gameId, selectedTier);
        setGamePhase('lobby');
      } else {
        console.error('❌ [App] Failed to fetch game data');
      }
    } catch (error) {
      console.error('❌ [App] Error joining game:', error);
    }
  }, [selectedTier, gameActions, saveGameSession]);

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

      console.log('⏳ [App] Waiting for game to be indexed...');
      // TODO: In production, parse transaction result for created game ID
      // For now, navigate back to discovery which will refresh and show the new game
      // User can then join their own created game from the list

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
    console.log('👋 [App] Leaving game');
    clearGameSession();
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
  }, [clearGameSession]);

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

        {gamePhase === 'lobby' && selectedTier && gameInfo && gameInfo.status === GameStatus.WAITING && (
          <GameLobby
            tier={selectedTier}
            gameId={gameInfo.gameId}
            packageId={GAME_PACKAGE_ID}
            onLeave={handleLeaveGame}
            onGameStart={handleGameStart}
          />
        )}

        {gamePhase === 'active' && gameInfo && address && gameInfo.status === GameStatus.ACTIVE && (
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

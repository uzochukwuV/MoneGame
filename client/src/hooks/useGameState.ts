import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useGameActions } from './useGameActions';
import { GAME_PACKAGE_ID } from '../config/game';
import type { Tier } from '../types/game';

type GamePhase = 'home' | 'lobby' | 'active' | 'results';

interface GameState {
  phase: GamePhase;
  gameId: string | null;
  tier: Tier | null;
  
  // Game data
  status: number;
  currentRound: number;
  playerCount: number;
  eliminatedCount: number;
  prizePool: string;
  currentQuestioner: string;
  
  // Question data
  question: {
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
  } | null;
  
  // Player state
  isQuestioner: boolean;
  hasAnswered: boolean;
  playerAnswer: number | null;
  isEliminated: boolean;
  
  // Voting
  votingStats: {
    votesA: number;
    votesB: number;
    votesC: number;
    majority: number;
  } | null;
  
  // Results
  canClaimPrize: boolean;
  survivors: string[];
}

export function useGameState() {
  const currentAccount = useCurrentAccount();
  const gameActions = useGameActions({ packageId: GAME_PACKAGE_ID });
  
  const [state, setState] = useState<GameState>({
    phase: 'home',
    gameId: null,
    tier: null,
    status: 0,
    currentRound: 0,
    playerCount: 0,
    eliminatedCount: 0,
    prizePool: '0',
    currentQuestioner: '',
    question: null,
    isQuestioner: false,
    hasAnswered: false,
    playerAnswer: null,
    isEliminated: false,
    votingStats: null,
    canClaimPrize: false,
    survivors: [],
  });



  // Poll game data
  useEffect(() => {
    if (!state.gameId || !currentAccount) return;

    const poll = async () => {
      const gameData = await gameActions.getGameInfo(state.gameId!);
      if (!gameData) return;

      const playerStatus = await gameActions.getPlayerStatus(
        state.gameId!,
        currentAccount.address
      );

      // Update state based on game status
      setState((prev : any) => ({
        ...prev,
        status: gameData.status,
        currentRound: gameData.currentRound,
        playerCount: gameData.players.length,
        eliminatedCount: gameData.eliminated.length,
        prizePool: gameData.prizePool,
        currentQuestioner: gameData.currentQuestioner,
        question: gameData.question,
        isQuestioner: gameData.currentQuestioner === currentAccount.address,
        hasAnswered: playerStatus?.hasAnswered || false,
        playerAnswer: playerStatus?.answer || null,
        isEliminated: playerStatus?.isEliminated || false,
      }));

      // Auto-transition phases
      if (gameData.status === 1 && state.phase === 'lobby') {
        setState(p => ({ ...p, phase: 'active' }));
      } else if (gameData.status === 2 && state.phase === 'active') {
        // Game finished
        const canClaim = await gameActions.canClaimPrize(
          state.gameId!,
          currentAccount.address
        );
        const survivors = gameData.players.filter(
          p => !gameData.eliminated.includes(p)
        );
        
        setState(p => ({
          ...p,
          phase: 'results',
          canClaimPrize: canClaim,
          survivors,
        }));
      }

      // Get voting stats if question exists and has answers
      if (gameData.question && Object.keys(gameData.answers).length > 0) {
        const votingResults = await gameActions.getVotingResults(state.gameId!);
        if (votingResults) {
          setState(p => ({ ...p, votingStats: votingResults }));
        }
      }
    };

    poll(); // Initial poll

    // Set up polling based on phase
    let interval: ReturnType<typeof setInterval>;
    if (state.phase === 'lobby') {
      interval = setInterval(poll, 2000); // Poll every 2s in lobby
    } else if (state.phase === 'active') {
      interval = setInterval(poll, 3000); // Poll every 3s in active game
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.gameId, state.phase, currentAccount, gameActions]);

  // Actions
  const createGame = useCallback(async (tier: Tier) => {
    try {
      const txDigest = await gameActions.createGame(tier);
      
      // Extract game ID from transaction events
      // For now, we'll need to poll for the created game
      // In production, parse events from transaction result
      
      setState(prev => ({
        ...prev,
        phase: 'lobby',
        tier,
        gameId: txDigest, // Temporary - should be actual game object ID
      }));

      return txDigest;
    } catch (err) {
      console.error('Failed to create game:', err);
      throw err;
    }
  }, [gameActions]);

  const joinGame = useCallback(async (gameId: string, tier: Tier) => {
    try {
      const txDigest = await gameActions.joinGame(gameId, tier);

      setState(prev => ({
        ...prev,
        phase: 'lobby',
        tier,
        gameId,
      }));

      return txDigest;
    } catch (err) {
      console.error('Failed to join game:', err);
      throw err;
    }
  }, [gameActions]);

  const askQuestion = useCallback(async (
    question: string,
    optionA: string,
    optionB: string,
    optionC: string,
    myAnswer: 1 | 2 | 3
  ) => {
    if (!state.gameId) throw new Error('No active game');

    try {
      const txDigest = await gameActions.askQuestion(
        state.gameId,
        question,
        optionA,
        optionB,
        optionC,
        myAnswer
      );

      setState(prev => ({
        ...prev,
        hasAnswered: true,
        playerAnswer: myAnswer,
      }));

      return txDigest;
    } catch (err) {
      console.error('Failed to ask question:', err);
      throw err;
    }
  }, [state.gameId, gameActions]);

  const submitAnswer = useCallback(async (choice: 1 | 2 | 3) => {
    if (!state.gameId) throw new Error('No active game');

    try {
      const txDigest = await gameActions.submitAnswer(state.gameId, choice);

      setState(prev => ({
        ...prev,
        hasAnswered: true,
        playerAnswer: choice,
      }));

      return txDigest;
    } catch (err) {
      console.error('Failed to submit answer:', err);
      throw err;
    }
  }, [state.gameId, gameActions]);

  const claimPrize = useCallback(async () => {
    if (!state.gameId) throw new Error('No active game');

    try {
      const txDigest = await gameActions.claimPrize(state.gameId);
      return txDigest;
    } catch (err) {
      console.error('Failed to claim prize:', err);
      throw err;
    }
  }, [state.gameId, gameActions]);

  const leaveGame = useCallback(() => {
    setState({
      phase: 'home',
      gameId: null,
      tier: null,
      status: 0,
      currentRound: 0,
      playerCount: 0,
      eliminatedCount: 0,
      prizePool: '0',
      currentQuestioner: '',
      question: null,
      isQuestioner: false,
      hasAnswered: false,
      playerAnswer: null,
      isEliminated: false,
      votingStats: null,
      canClaimPrize: false,
      survivors: [],
    });
  }, []);

  return {
    state,
    actions: {
      createGame,
      joinGame,
      askQuestion,
      submitAnswer,
      claimPrize,
      leaveGame,
    },
    isLoading: gameActions.isLoading,
    error: gameActions.error,
  };
}

import { useState, useCallback } from 'react';
import { GameState, GameStatus, Tier, Question, VotingStats } from '../types/game';

const initialGameState: GameState = {
  gameInfo: null,
  isPlayerInGame: false,
  isPlayerEliminated: false,
  hasPlayerAnswered: false,
  playerAnswer: null,
  question: null,
  timeRemaining: 0,
  answerCount: 0,
  votingStats: null,
  survivors: [],
  canClaimPrize: false,
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockAddress = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setWalletAddress(mockAddress);
    setIsConnecting(false);
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setGameState(initialGameState);
  }, []);

  const joinGame = useCallback(async (tier: Tier, gameId: string) => {
    setGameState(prev => ({
      ...prev,
      gameInfo: {
        gameId,
        tier,
        status: GameStatus.WAITING,
        currentRound: 0,
        playerCount: Math.floor(Math.random() * 30) + 5,
        eliminatedCount: 0,
        prizePool: 0,
        currentQuestioner: '',
        questionAsked: false,
      },
      isPlayerInGame: true,
    }));
  }, []);

  const startGame = useCallback(async () => {
    if (!gameState.gameInfo) return;
    
    const questioner = walletAddress || '';
    setGameState(prev => ({
      ...prev,
      gameInfo: prev.gameInfo ? {
        ...prev.gameInfo,
        status: GameStatus.ACTIVE,
        currentRound: 1,
        currentQuestioner: questioner,
      } : null,
      timeRemaining: 120000,
    }));
  }, [gameState.gameInfo, walletAddress]);

  const askQuestion = useCallback(async (question: Question, myAnswer: 1 | 2 | 3) => {
    setGameState(prev => ({
      ...prev,
      gameInfo: prev.gameInfo ? {
        ...prev.gameInfo,
        questionAsked: true,
      } : null,
      question,
      hasPlayerAnswered: true,
      playerAnswer: myAnswer,
      timeRemaining: 60000,
      answerCount: 1,
    }));
  }, []);

  const submitAnswer = useCallback(async (choice: 1 | 2 | 3) => {
    setGameState(prev => ({
      ...prev,
      hasPlayerAnswered: true,
      playerAnswer: choice,
      answerCount: prev.answerCount + 1,
    }));
  }, []);

  const updateTimeRemaining = useCallback((time: number) => {
    setGameState(prev => ({ ...prev, timeRemaining: time }));
  }, []);

  const showVotingResults = useCallback((stats: VotingStats, eliminated: boolean) => {
    setGameState(prev => ({
      ...prev,
      votingStats: stats,
      isPlayerEliminated: eliminated,
    }));
  }, []);

  const nextRound = useCallback((newQuestioner: string) => {
    setGameState(prev => ({
      ...prev,
      gameInfo: prev.gameInfo ? {
        ...prev.gameInfo,
        currentRound: prev.gameInfo.currentRound + 1,
        currentQuestioner: newQuestioner,
        questionAsked: false,
      } : null,
      question: null,
      hasPlayerAnswered: false,
      playerAnswer: null,
      votingStats: null,
      timeRemaining: 120000,
      answerCount: 0,
    }));
  }, []);

  const finishGame = useCallback((survivors: string[], canClaim: boolean) => {
    setGameState(prev => ({
      ...prev,
      gameInfo: prev.gameInfo ? {
        ...prev.gameInfo,
        status: GameStatus.FINISHED,
      } : null,
      survivors,
      canClaimPrize: canClaim,
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initialGameState);
  }, []);

  return {
    gameState,
    walletAddress,
    isConnecting,
    connectWallet,
    disconnectWallet,
    joinGame,
    startGame,
    askQuestion,
    submitAnswer,
    updateTimeRemaining,
    showVotingResults,
    nextRound,
    finishGame,
    resetGame,
  };
}

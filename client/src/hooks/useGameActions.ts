import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import type { Tier } from '../../../game_onchain/src';

interface UseGameActionsProps {
  packageId: string;
}

interface GameData {
  gameId: string;
  tier: number;
  status: number;
  currentRound: number;
  players: string[];
  eliminated: string[];
  prizePool: string;
  currentQuestioner: string;
  question: {
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
  } | null;
  answers: Record<string, number>;
}

export function useGameActions({ packageId }: UseGameActionsProps) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(async (tier: Tier) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();
      
      // Add your create game logic here
      tx.moveCall({
        target: `${packageId}::majority_rules::create_game`,
        arguments: [
          tx.pure.u8(tier),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create game';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, packageId, signAndExecute]);

  const joinGame = useCallback(async (gameId: string, tier: Tier, entryFee: number) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      // Split coins for entry fee
      const [coin] = tx.splitCoins(tx.gas, [entryFee]);

      tx.moveCall({
        target: `${packageId}::majority_rules::join_game`,
        arguments: [
          tx.object(gameId),
          coin,
          tx.pure.u8(tier),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to join game';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, packageId, signAndExecute]);

  const askQuestion = useCallback(async (
    gameId: string,
    question: string,
    optionA: string,
    optionB: string,
    optionC: string,
    myAnswer: 1 | 2 | 3
  ) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::majority_rules::ask_question`,
        arguments: [
          tx.object(gameId),
          tx.pure.string(question),
          tx.pure.string(optionA),
          tx.pure.string(optionB),
          tx.pure.string(optionC),
          tx.pure.u8(myAnswer),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to ask question';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, packageId, signAndExecute]);

  const submitAnswer = useCallback(async (gameId: string, choice: 1 | 2 | 3) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::majority_rules::submit_answer`,
        arguments: [
          tx.object(gameId),
          tx.pure.u8(choice),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, packageId, signAndExecute]);

  const claimPrize = useCallback(async (gameId: string) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::majority_rules::claim_prize`,
        arguments: [tx.object(gameId)],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim prize';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, packageId, signAndExecute]);

  // ========== GETTER FUNCTIONS ==========

  const getGameInfo = useCallback(async (gameId: string): Promise<GameData | null> => {
    try {
      const object = await suiClient.getObject({
        id: gameId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!object.data || !object.data.content || object.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = object.data.content.fields as any;

      return {
        gameId,
        tier: fields.tier || 0,
        status: fields.status || 0,
        currentRound: fields.current_round || 0,
        players: fields.players || [],
        eliminated: fields.eliminated || [],
        prizePool: fields.prize_pool || '0',
        currentQuestioner: fields.current_questioner || '',
        question: fields.question ? {
          text: fields.question.text || '',
          optionA: fields.question.option_a || '',
          optionB: fields.question.option_b || '',
          optionC: fields.question.option_c || '',
        } : null,
        answers: fields.answers || {},
      };
    } catch (err) {
      console.error('Failed to get game info:', err);
      return null;
    }
  }, [suiClient]);

  const getPlayerStatus = useCallback(async (gameId: string, playerAddress: string) => {
    const gameData = await getGameInfo(gameId);
    if (!gameData) return null;

    return {
      isInGame: gameData.players.includes(playerAddress),
      isEliminated: gameData.eliminated.includes(playerAddress),
      hasAnswered: playerAddress in gameData.answers,
      answer: gameData.answers[playerAddress] || null,
    };
  }, [getGameInfo]);

  const getAvailableGames = useCallback(async (_tier: Tier) => {
    try {
      // Query for games with status = WAITING (0) and matching tier
      // This requires dynamic field queries or event indexing
      // For now, return empty array - implement with indexer
      console.warn('getAvailableGames not yet implemented - needs indexer');
      return [];
    } catch (err) {
      console.error('Failed to get available games:', err);
      return [];
    }
  }, []);

  const getLobbyInfo = useCallback(async (tier: Tier) => {
    try {
      // Get tier lobby object
      const objects = await suiClient.getOwnedObjects({
        owner: packageId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      // Find the tier lobby for this tier
      for (const obj of objects.data) {
        if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') continue;
        
        const fields = obj.data.content.fields as any;
        if (fields.tier === tier) {
          return {
            tier,
            activeGames: fields.active_games || 0,
            totalPlayers: fields.total_players || 0,
          };
        }
      }

      return null;
    } catch (err) {
      console.error('Failed to get lobby info:', err);
      return null;
    }
  }, [suiClient, packageId]);

  const getVotingResults = useCallback(async (gameId: string) => {
    const gameData = await getGameInfo(gameId);
    if (!gameData || !gameData.question) return null;

    const answers = Object.values(gameData.answers);
    const votesA = answers.filter(a => a === 1).length;
    const votesB = answers.filter(a => a === 2).length;
    const votesC = answers.filter(a => a === 3).length;

    const majority = votesA >= votesB && votesA >= votesC ? 1 : votesB >= votesC ? 2 : 3;

    return {
      votesA,
      votesB,
      votesC,
      majority,
      totalVotes: answers.length,
    };
  }, [getGameInfo]);

  const canClaimPrize = useCallback(async (gameId: string, playerAddress: string) => {
    const gameData = await getGameInfo(gameId);
    if (!gameData) return false;

    return (
      gameData.status === 2 && // FINISHED
      gameData.players.includes(playerAddress) &&
      !gameData.eliminated.includes(playerAddress)
    );
  }, [getGameInfo]);

  return {
    // Actions
    createGame,
    joinGame,
    askQuestion,
    submitAnswer,
    claimPrize,
    
    // Getters
    getGameInfo,
    getPlayerStatus,
    getAvailableGames,
    getLobbyInfo,
    getVotingResults,
    canClaimPrize,
    
    // State
    isLoading,
    error,
  };
}

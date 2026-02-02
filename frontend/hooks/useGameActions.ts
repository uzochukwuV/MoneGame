import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Tier } from '@/types/game';
import {
  TIER_FEES,
  CLOCK_OBJECT,
  GAME_PACKAGE_ID,
  TIER_LOBBY_IDS,
  PLATFORM_TREASURY_ID,
  BADGE_REGISTRY_ID,
  ITEM_SHOP_ID,
  HACKATHON_COIN_TYPE,
  TOKEN_SYMBOL
} from '@/lib/constants';
import type { GameData } from '@/types/game';

interface UseGameActionsReturn {
  // Game lifecycle actions
  createGame: (tier: Tier) => Promise<string>;
  joinGame: (gameId: string, tier: Tier) => Promise<string>;
  startGame: (gameId: string) => Promise<string>;

  // In-game actions
  askQuestion: (
    gameId: string,
    question: string,
    optionA: string,
    optionB: string,
    optionC: string,
    myAnswer: 1 | 2 | 3
  ) => Promise<string>;
  submitAnswer: (gameId: string, choice: 1 | 2 | 3) => Promise<string>;
  finalizeRound: (gameId: string) => Promise<string>;

  // Prize actions
  claimPrize: (gameId: string) => Promise<string>;

  // Helper queries
  getTierLobby: (tier: Tier) => string;
  getPlatformTreasury: () => string;
  getBadgeRegistry: () => string;
  getItemShop: () => string;

  // Data fetchers
  getGameInfo: (gameId: string) => Promise<GameData | null>;
  getPlayerStatus: (gameId: string, playerAddress: string) => Promise<any>;
  getVotingResults: (gameId: string) => Promise<any>;
  canClaimPrize: (gameId: string, playerAddress: string) => Promise<boolean>;

  // State
  isLoading: boolean;
  error: string | null;
}

export function useGameActions(): UseGameActionsReturn {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========== HELPER FUNCTIONS ==========

  const getTierLobby = useCallback((tier: Tier): string => {
    const lobbyId = TIER_LOBBY_IDS[tier];
    if (!lobbyId) {
      throw new Error(`Tier ${tier} lobby not found`);
    }
    console.log('✅ Using lobby ID for tier', tier, ':', lobbyId.slice(0, 8) + '...');
    return lobbyId;
  }, []);

  const getPlatformTreasury = useCallback((): string => {
    console.log('✅ Using platform treasury:', PLATFORM_TREASURY_ID.slice(0, 8) + '...');
    return PLATFORM_TREASURY_ID;
  }, []);

  const getBadgeRegistry = useCallback((): string => {
    console.log('✅ Using badge registry:', BADGE_REGISTRY_ID.slice(0, 8) + '...');
    return BADGE_REGISTRY_ID;
  }, []);

  const getItemShop = useCallback((): string => {
    console.log('✅ Using item shop:', ITEM_SHOP_ID.slice(0, 8) + '...');
    return ITEM_SHOP_ID;
  }, []);

  // ========== GAME LIFECYCLE ACTIONS ==========

  const createGame = useCallback(async (tier: Tier) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎮 Creating game for tier:', tier);
      const tx = new Transaction();

      const lobbyId = await getTierLobby(tier);
      console.log('🎯 Using lobby ID:', lobbyId.slice(0, 8) + '...');

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::create_game`,
        arguments: [
          tx.object(lobbyId),
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Game created! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create game';
      console.error('❌ Create game error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute, getTierLobby]);

  const joinGame = useCallback(async (gameId: string, tier: Tier) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎮 Joining game:', gameId.slice(0, 8) + '...');
      const userAddress = currentAccount.address;

      const lobbyId = await getTierLobby(tier);
      const treasuryId = await getPlatformTreasury();

      // Get user's HACKATHON coins
      const coins = await suiClient.getCoins({
        owner: userAddress,
        coinType: HACKATHON_COIN_TYPE,
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error(`No ${TOKEN_SYMBOL} tokens found. Please ensure you have ${TOKEN_SYMBOL} in your wallet.`);
      }

      const entryFeeMIST = TIER_FEES[tier];
      const sortedCoins = coins.data.sort((a, b) =>
        Number(BigInt(b.balance) - BigInt(a.balance))
      );

      const gasCoin = sortedCoins[0]!;
      const gasBalance = BigInt(gasCoin.balance);
      const totalNeededMIST = BigInt(entryFeeMIST) + BigInt(10_000_000); // entry + gas

      if (gasBalance < totalNeededMIST) {
        const availableTokens = Number(gasBalance) / 1_000_000_000;
        const neededTokens = Number(totalNeededMIST) / 1_000_000_000;
        throw new Error(
          `Insufficient balance. Have ${availableTokens.toFixed(4)} ${TOKEN_SYMBOL}, need ${neededTokens.toFixed(4)} ${TOKEN_SYMBOL}`
        );
      }

      const tx = new Transaction();

      tx.setGasPayment([{
        digest: gasCoin.digest,
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
      }]);

      const [paymentCoin] = tx.splitCoins(tx.gas, [entryFeeMIST]);

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::join_game`,
        arguments: [
          tx.object(lobbyId),
          tx.object(gameId),
          tx.object(treasuryId),
          paymentCoin,
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Successfully joined game! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to join game';
      console.error('❌ Join game error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute, suiClient, getTierLobby, getPlatformTreasury]);

  const startGame = useCallback(async (gameId: string) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting game:', gameId.slice(0, 8) + '...');
      const tx = new Transaction();

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::start_game`,
        arguments: [
          tx.object(gameId),
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Game started! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start game';
      console.error('❌ Start game error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute]);

  // ========== IN-GAME ACTIONS ==========

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
      console.log('🎯 Asking question...');
      const tx = new Transaction();

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::ask_question`,
        arguments: [
          tx.object(gameId),
          tx.pure.string(question),
          tx.pure.string(optionA),
          tx.pure.string(optionB),
          tx.pure.string(optionC),
          tx.pure.u8(myAnswer),
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Question asked! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to ask question';
      console.error('❌ Ask question error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute]);

  const submitAnswer = useCallback(async (gameId: string, choice: 1 | 2 | 3) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::submit_answer`,
        arguments: [
          tx.object(gameId),
          tx.pure.u8(choice),
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Answer submitted! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit answer';
      console.error('❌ Submit answer error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute]);

  const finalizeRound = useCallback(async (gameId: string) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();
      const badgeRegistryId = getBadgeRegistry();

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::finalize_round`,
        arguments: [
          tx.object(gameId),
          tx.object(badgeRegistryId), // ✅ FIXED: Added BadgeRegistry
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Round finalized! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to finalize round';
      console.error('❌ Finalize round error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute, getBadgeRegistry]);

  const claimPrize = useCallback(async (gameId: string) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${GAME_PACKAGE_ID}::battle_royale::claim_prize`,
        arguments: [tx.object(gameId)],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ Prize claimed! Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim prize';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecute]);

  // ========== DATA FETCHERS ==========

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
        question: fields.question_text ? {
          text: fields.question_text || '',
          optionA: fields.option_a || '',
          optionB: fields.option_b || '',
          optionC: fields.option_c || '',
        } : null,
        answers: fields.player_answers || {},
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
    startGame,
    askQuestion,
    submitAnswer,
    finalizeRound,
    claimPrize,

    // Helpers
    getTierLobby,
    getPlatformTreasury,
    getBadgeRegistry,
    getItemShop,

    // Data fetchers
    getGameInfo,
    getPlayerStatus,
    getVotingResults,
    canClaimPrize,

    // State
    isLoading,
    error,
  };
}

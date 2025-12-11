import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import type { Tier } from '../types/game';
import { TIER_FEES } from '../types/game';

// Sui Clock object (shared object at 0x6)
const CLOCK_OBJECT = '0x0000000000000000000000000000000000000000000000000000000000000006';

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

  const getTierLobby = useCallback(
    async (tier: Tier): Promise<string> => {
      console.log('🎟️ Querying tier lobby for tier:', tier);
      const response = await suiClient.queryEvents({
        query: {
          MoveEventType: `${packageId}::battle_royale::TierLobbyCreated`,
        } as any,
      });

      console.log('📦 GameCreated events:', response.data?.length);

      const tierEvent = response.data?.find((event: any) =>
        Number(event.parsedJson?.tier) === tier
      ) as any;

      if (!tierEvent) {
        throw new Error(`Tier ${tier} lobby not found`);
      }

      const lobbyId = tierEvent.parsedJson?.lobby_id;
      console.log('✅ Found lobby ID:', lobbyId?.slice(0, 8) + '...');
      return lobbyId;
    },
    [suiClient, packageId]
  );

 const getPlatformTreasury = useCallback(async (): Promise<string> => {
  console.log('💰 Querying platform treasury...');
  const response = await suiClient.queryEvents({
    query: {
      MoveEventType: `${packageId}::battle_royale::PlatformTreasuryCreated`,
    } as any,
  });

  console.log('📦 PlatformTreasuryCreated events:', response.data?.length);

  if (!response.data || response.data.length === 0) {
    throw new Error('Platform treasury not found');
  }

  // There should only be one platform treasury (created during init)
  const treasuryEvent = response.data[0] as any;
  const treasuryId = treasuryEvent.parsedJson?.treasury_id;
  
  console.log('✅ Found treasury ID:', treasuryId?.slice(0, 8) + '...');
  return treasuryId!;
}, [suiClient, packageId]);

  const createGame = useCallback(async (tier: Tier) => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎮 Creating game for tier:', tier);
      const tx = new Transaction();

      // Get tier lobby
      const lobbyId = await getTierLobby(tier);
      console.log('🎯 Using lobby ID for transaction:', lobbyId.slice(0, 8) + '...');

      // Call create_game with lobby and clock
      tx.moveCall({
        target: `${packageId}::battle_royale::create_game`,
        arguments: [
          tx.object(lobbyId),
          tx.object(CLOCK_OBJECT),
        ],
      });

      console.log('📤 Executing create game transaction...');
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
  }, [currentAccount, packageId, signAndExecute, getTierLobby]);




  const joinGame = useCallback(async (gameId: string, tier: Tier) => {
  if (!currentAccount) {
    throw new Error('Wallet not connected');
  }

  setIsLoading(true);
  setError(null);

  try {
    console.log('🎮 Joining game:', gameId.slice(0, 8) + '...');
    const userAddress = currentAccount.address;

    // Get required objects
    console.log('📦 Fetching lobby, treasury, and user coins...');
    const lobbyId = await getTierLobby(tier);
    const treasuryId = await getPlatformTreasury();

    // Get user's OCT coins
    const coins = await suiClient.getAllCoins({
      owner: userAddress,
    });

    console.log('📊 Total coins found:', coins.data.length);

    if (!coins.data || coins.data.length === 0) {
      throw new Error('No coins found. Please ensure you have OCT in your wallet.');
    }

    // Get the entry fee required
    const entryFeeMIST = TIER_FEES[tier];
    const entryFeeOCT = entryFeeMIST / 1_000_000_000;
    console.log('💰 Entry fee required:', entryFeeOCT, 'OCT =', entryFeeMIST, 'MIST');

    // Sort coins by balance (largest first)
    const sortedCoins = coins.data.sort((a, b) => 
      Number(BigInt(b.balance) - BigInt(a.balance))
    );

    // Use the largest coin for gas
    const gasCoin = sortedCoins[0]!;
    const gasBalance = BigInt(gasCoin.balance);
    const totalNeededMIST = BigInt(entryFeeMIST) + BigInt(10_000_000); // entry + gas

    if (gasBalance < totalNeededMIST) {
      const availableOCT = Number(gasBalance) / 1_000_000_000;
      const neededOCT = Number(totalNeededMIST) / 1_000_000_000;
      throw new Error(
        `Insufficient balance. Have ${availableOCT.toFixed(4)} OCT, need ${neededOCT.toFixed(4)} OCT`
      );
    }

    console.log('✅ Using coin for gas:', gasCoin.coinObjectId.slice(0, 8) + '...');

    // Create transaction
    const tx = new Transaction();

    // Set gas payment explicitly (like the working example)
    tx.setGasPayment([{
      digest: gasCoin.digest,
      objectId: gasCoin.coinObjectId,
      version: gasCoin.version,
    }]);

    // Split entry fee from gas coin (like the working example)
    const [paymentCoin] = tx.splitCoins(tx.gas, [entryFeeMIST]);

    console.log('🎯 Calling join_game...');
    console.log('   - Lobby:', lobbyId.slice(0, 8) + '...');
    console.log('   - Game:', gameId.slice(0, 8) + '...');
    console.log('   - Treasury:', treasuryId.slice(0, 8) + '...');
    console.log('   - Payment: split from gas with', entryFeeMIST, 'MIST');

    // Call join_game
    tx.moveCall({
      target: `${packageId}::battle_royale::join_game`,
      arguments: [
        tx.object(lobbyId),       // lobby: &TierLobby
        tx.object(gameId),         // game: &mut Game
        tx.object(treasuryId),     // treasury: &mut PlatformTreasury
        paymentCoin,               // payment: Coin<OCT>
        tx.object(CLOCK_OBJECT),   // clock: &Clock
      ],
    });

    console.log('📤 Executing join game transaction...');
    const result = await signAndExecute({
      transaction: tx,
    });

    console.log('✅ Successfully joined game! Digest:', result.digest);
    return result.digest;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to join game';
    console.error('❌ Join game error:', errorMsg);
    console.error('Full error:', err);
    setError(errorMsg);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [currentAccount, packageId, signAndExecute, suiClient, getTierLobby, getPlatformTreasury]);









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
      console.log('🎯 [useGameActions] Asking question with:');
      console.log('   - gameId:', gameId);
      console.log('   - question:', question);
      console.log('   - options:', optionA, optionB, optionC);
      console.log('   - myAnswer:', myAnswer);
      console.log('   - currentUser:', currentAccount.address);

      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::battle_royale::ask_question`,
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

      console.log('📤 [useGameActions] Sending ask_question transaction...');
      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ [useGameActions] Ask question successful!');
      console.log('   - Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to ask question';
      console.error('❌ [useGameActions] Ask question failed:');
      console.error('   - Error:', errorMsg);
      console.error('   - Full error:', err);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, packageId, signAndExecute]);

  const startGame = useCallback(async (gameId: string) => {
  if (!currentAccount) {
    throw new Error('Wallet not connected');
  }

  setIsLoading(true);
  setError(null);

  try {
    console.log('🚀 Starting game:', gameId.slice(0, 8) + '...');

    // Create transaction
    const tx = new Transaction();

    // Call start_game
    tx.moveCall({
      target: `${packageId}::battle_royale::start_game`,
      arguments: [
        tx.object(gameId),
        tx.object(CLOCK_OBJECT),
      ],
    });

    console.log('📤 Executing start game transaction...');
    const result = await signAndExecute({
      transaction: tx,
    });

    console.log('✅ Successfully started game! Digest:', result.digest);
    return result.digest;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to start game';
    console.error('❌ Start game error:', errorMsg);
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
        target: `${packageId}::battle_royale::submit_answer`,
        arguments: [
          tx.object(gameId),
          tx.pure.u8(choice),
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      console.log('✅ [useGameActions] Submit answer successful. Digest:', result.digest);
      return result.digest;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit answer';
      console.error('❌ [useGameActions] Submit answer error:', errorMsg);
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
        target: `${packageId}::battle_royale::claim_prize`,
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
      console.log(fields, "jsvajsvjhavsjhvhAVHAVSjsvjhAVHJSVajhvhjaVJHVjhavjsHJAVSHJavshvHAVSJHvhvsAH")

      console.log({
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
      })
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


  const finaliseRound = useCallback(async (gameId: string) => {
    const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::battle_royale::finalize_round`,
        arguments: [
          tx.object(gameId),
          tx.object(CLOCK_OBJECT),
        ],
      });

      const result = await signAndExecute({
        transaction: tx,
      });
      return result.digest;
  }, [suiClient, packageId]);



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
    finaliseRound,
    // Getters
    getGameInfo,
    getPlayerStatus,
    getAvailableGames,
    getLobbyInfo,
    getVotingResults,
    canClaimPrize,

    // Helpers
    getTierLobby,
    getPlatformTreasury,
    startGame,
    // State
    isLoading,
    error,
  };
}

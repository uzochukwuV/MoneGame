import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useCallback } from 'react';
import { useGasSponsor } from './useGasSponsor';
import {
  GAME_PACKAGE_ID,
  TIER_LOBBY_IDS,
  BADGE_REGISTRY_ID,
  PLATFORM_TREASURY_ID,
  CLOCK_OBJECT,
} from '@/lib/constants';
import { Tier } from '@/types/game';

/**
 * Enhanced Game Actions Hook with Gas Sponsorship
 *
 * This hook wraps all game actions with automatic gas sponsorship.
 * All transactions are sent through the sponsor endpoint, falling back
 * to user-paid gas if sponsorship fails.
 */

export function useGameActionsWithSponsor() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { executeWithSponsor } = useGasSponsor();

  // Helper: Get Tier Lobby ID
  const getTierLobby = useCallback((tier: Tier): string => {
    const lobbyId = TIER_LOBBY_IDS[tier];
    if (!lobbyId) throw new Error(`Tier ${tier} lobby not found`);
    return lobbyId;
  }, []);

  // Helper: Get Badge Registry ID
  const getBadgeRegistry = useCallback((): string => {
    return BADGE_REGISTRY_ID;
  }, []);

  // Create a new game in a tier lobby
  const createGame = useCallback(async (tier: Tier) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();
    const lobbyId = getTierLobby(tier);

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::create_game`,
      arguments: [
        tx.object(lobbyId),
        tx.object(CLOCK_OBJECT),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor, getTierLobby]);

  // Join an existing game
  const joinGame = useCallback(async (
    tier: Tier,
    gameId: string
  ) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();
    const lobbyId = getTierLobby(tier);

    // Get user's coins and split the entry fee
    const coins = await client.getAllCoins({ owner: currentAccount.address });
    if (!coins.data || coins.data.length === 0) {
      throw new Error('No coins found');
    }

    // Use the first coin
    const paymentCoin = tx.object(coins.data[0].coinObjectId);

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::join_game`,
      arguments: [
        tx.object(lobbyId),
        tx.object(gameId),
        tx.object(PLATFORM_TREASURY_ID),
        paymentCoin,
        tx.object(CLOCK_OBJECT),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, client, executeWithSponsor, getTierLobby]);

  // Start the game (first player can start after min players reached)
  const startGame = useCallback(async (gameId: string) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::start_game`,
      arguments: [
        tx.object(gameId),
        tx.object(CLOCK_OBJECT),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor]);

  // Ask a question (current questioner only)
  const askQuestion = useCallback(async (
    gameId: string,
    questionText: string,
    optionA: string,
    optionB: string,
    optionC: string,
    questionerAnswer: 1 | 2 | 3
  ) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::ask_question`,
      arguments: [
        tx.object(gameId),
        tx.pure.string(questionText),
        tx.pure.string(optionA),
        tx.pure.string(optionB),
        tx.pure.string(optionC),
        tx.pure.u8(questionerAnswer),
        tx.object(CLOCK_OBJECT),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor]);

  // Submit an answer to the current question
  const submitAnswer = useCallback(async (
    gameId: string,
    choice: number
  ) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::submit_answer`,
      arguments: [
        tx.object(gameId),
        tx.pure.u8(choice),
        tx.object(CLOCK_OBJECT),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor]);

  // Finalize the current round (eliminates players, advances game state)
  const finalizeRound = useCallback(async (gameId: string) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();
    const badgeRegistryId = getBadgeRegistry();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::finalize_round`,
      arguments: [
        tx.object(gameId),
        tx.object(badgeRegistryId),
        tx.object(CLOCK_OBJECT),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor, getBadgeRegistry]);

  // Reveal player's own role
  const revealRole = useCallback(async (gameId: string): Promise<'citizen' | 'saboteur'> => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::reveal_my_role`,
      arguments: [tx.object(gameId)],
    });

    const result = await executeWithSponsor(tx);

    // Parse events to get the role
    // The RoleRevealed event contains the role (1=citizen, 2=saboteur)
    // For now, we'll return a default - in production you'd parse the event
    return 'citizen'; // TODO: Parse from event
  }, [currentAccount, executeWithSponsor]);

  // Use immunity token to avoid elimination
  const useImmunity = useCallback(async (gameId: string, tokenId: string) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::use_immunity_token`,
      arguments: [
        tx.object(gameId),
        tx.object(tokenId),
      ],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor]);

  // Claim prize (only winners can call this)
  const claimPrize = useCallback(async (gameId: string) => {
    if (!currentAccount) throw new Error('No account connected');

    const tx = new Transaction();

    tx.moveCall({
      target: `${GAME_PACKAGE_ID}::battle_royale::claim_prize`,
      arguments: [tx.object(gameId)],
    });

    const result = await executeWithSponsor(tx);
    return result.digest;
  }, [currentAccount, executeWithSponsor]);

  // Query: Get game data by ID
  const getGameData = useCallback(async (gameId: string) => {
    const gameObject = await client.getObject({
      id: gameId,
      options: {
        showContent: true,
      },
    });

    if (!gameObject.data) {
      throw new Error('Game not found');
    }

    return gameObject.data;
  }, [client]);

  // Query: Get all games in a tier lobby
  const getGamesInLobby = useCallback(async (tier: Tier) => {
    const lobbyId = getTierLobby(tier);

    const lobbyObject = await client.getObject({
      id: lobbyId,
      options: {
        showContent: true,
      },
    });

    if (!lobbyObject.data?.content || !('fields' in lobbyObject.data.content)) {
      return [];
    }

    const fields = lobbyObject.data.content.fields as any;
    return fields.active_games || [];
  }, [client, getTierLobby]);

  // Query: Check if player is in a game
  const isPlayerInGame = useCallback(async (
    gameId: string,
    playerAddress: string
  ): Promise<boolean> => {
    const gameData = await getGameData(gameId);

    if (!gameData.content || !('fields' in gameData.content)) {
      return false;
    }

    const fields = gameData.content.fields as any;
    const players = fields.players || [];
    return players.includes(playerAddress);
  }, [getGameData]);

  return {
    // Transaction functions (all gas-sponsored)
    createGame,
    joinGame,
    startGame,
    askQuestion,
    submitAnswer,
    finalizeRound,
    revealRole,
    useImmunity,
    claimPrize,

    // Query functions (no gas cost)
    getGameData,
    getGamesInLobby,
    isPlayerInGame,

    // Helper functions
    getTierLobby,
    getBadgeRegistry,
  };
}

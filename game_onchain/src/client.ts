import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { type GameConfig, Tier, TIER_FEES,type GameInfo } from './types';
import { GasSponsor } from './sponsor';

export class MajorityRulesClient {
  private client: SuiClient;
  private packageId: string;
  private sponsor?: GasSponsor;

  constructor(config: GameConfig) {
    const rpcUrl =
      config.rpcUrl ||
      (config.network === 'testnet'
        ? 'https://rpc-testnet.onelabs.cc:443'
        : 'https://rpc-mainnet.onelabs.cc:443');

    this.client = new SuiClient({ url: rpcUrl });
    this.packageId = config.packageId;
  }

  /**
   * Enable gas sponsorship
   */
  enableSponsor(sponsorKeypair: Ed25519Keypair, maxGasPerTx?: number) {
    this.sponsor = new GasSponsor(this.client, sponsorKeypair, maxGasPerTx);
  }

  /**
   * Get tier lobby object ID
   */
  async getTierLobby(tier: Tier): Promise<string> {


    const response = await this.client.queryEvents({
  query: {
    MoveEventType: `${this.packageId}::battle_royale::TierLobbyCreated`
  }
});
 console.log(response)

 // Extract the lobby_id from the TierLobbyCreated event for tier 1
const tier1Event = response.data.find((event: any) => 
  event.parsedJson?.tier === 1
) as any;

  console.log(tier1Event)
    
  if (!tier1Event) {
  throw new Error('Tier 1 lobby not found');
}
    
  return tier1Event.parsedJson.lobby_id;
  }

  /**
   * Create a new game
   */
  async createGame(
    tier: Tier,
    userKeypair: Ed25519Keypair,
    gasless: boolean = false
  ): Promise<string> {
    const tx = new Transaction();
    const lobbyId = await this.getTierLobby(tier);

    // Get clock object (shared object at 0x6)
    const clock = '0x0000000000000000000000000000000000000000000000000000000000000006';

    tx.moveCall({
      target: `${this.packageId}::battle_royale::create_game`,
      arguments: [tx.object(lobbyId), tx.object(clock)],
    });

    if (gasless && this.sponsor) {
      // Gasless execution
      const userAddress = userKeypair.toSuiAddress();
      const sponsoredData = await this.sponsor.sponsorTransaction(
        tx,
        userAddress
      );

      // User signs
      const txBytes = Uint8Array.from(JSON.parse(sponsoredData).txBytes);
      const userSig = await userKeypair.signTransaction(txBytes);

      // Execute with both signatures
      const result = await this.sponsor.executeSponsored(
        txBytes,
        userSig.signature,
        JSON.parse(sponsoredData).sponsorSignature
      );

      return result.digest;
    } else {
      // User pays gas
      const result = await this.client.signAndExecuteTransaction({
        signer: userKeypair,
        transaction: tx,
      });

      return result.digest;
    }
  }

  /**
   * Join existing game (GASLESS)
   */
  async joinGame(
    tier: Tier,
    gameId: string,
    userKeypair: Ed25519Keypair,
    gasless: boolean = true
  ): Promise<string> {
    const tx = new Transaction();
    const userAddress = userKeypair.toSuiAddress();

    // Get required objects
    const lobbyId = await this.getTierLobby(tier);
    const treasuryId = await this.getPlatformTreasury();
    const clock = '0x0000000000000000000000000000000000000000000000000000000000000006';

    // Get user's coins for entry fee
    const coins = await this.client.getAllCoins({ owner: userAddress });
    if (coins.data.length === 0) {
      throw new Error('User has no coins');
    }

    // Split entry fee from user's coin
    const entryFee = TIER_FEES[tier];
    const paymentCoin = tx.splitCoins(tx.object(coins.data[0]?.coinObjectId!), [
      entryFee,
    ])[0];

    // Call join_game
    tx.moveCall({
      target: `${this.packageId}::battle_royale::join_game`,
      arguments: [
        tx.object(lobbyId),
        tx.object(gameId),
        tx.object(treasuryId),
        paymentCoin!,
        tx.object(clock),
      ],
    });

    if (gasless && this.sponsor) {
      // Sponsor pays gas
      const sponsoredData = await this.sponsor.sponsorTransaction(
        tx,
        userAddress
      );

      const txBytes = Uint8Array.from(JSON.parse(sponsoredData).txBytes);
      const userSig = await userKeypair.signTransaction(txBytes);

      const result = await this.sponsor.executeSponsored(
        txBytes,
        userSig.signature,
        JSON.parse(sponsoredData).sponsorSignature
      );

      return result.digest;
    } else {
      const result = await this.client.signAndExecuteTransaction({
        signer: userKeypair,
        transaction: tx,
      });

      return result.digest;
    }
  }

  /**
   * Start game (GASLESS)
   */
  async startGame(
    gameId: string,
    userKeypair: Ed25519Keypair,
    gasless: boolean = true
  ): Promise<string> {
    const tx = new Transaction();
    const clock = '0x0000000000000000000000000000000000000000000000000000000000000006';

    tx.moveCall({
      target: `${this.packageId}::battle_royale::start_game`,
      arguments: [tx.object(gameId), tx.object(clock)],
    });

    return this.executeTransaction(tx, userKeypair, gasless);
  }

  /**
   * Ask question (GASLESS)
   */
  async askQuestion(
    gameId: string,
    question: string,
    optionA: string,
    optionB: string,
    optionC: string,
    myAnswer: 1 | 2 | 3,
    userKeypair: Ed25519Keypair,
    gasless: boolean = true
  ): Promise<string> {
    const tx = new Transaction();
    const clock = '0x0000000000000000000000000000000000000000000000000000000000000006';

    tx.moveCall({
      target: `${this.packageId}::battle_royale::ask_question`,
      arguments: [
        tx.object(gameId),
        tx.pure.string(question),
        tx.pure.string(optionA),
        tx.pure.string(optionB),
        tx.pure.string(optionC),
        tx.pure.u8(myAnswer),
        tx.object(clock),
      ],
    });

    return this.executeTransaction(tx, userKeypair, gasless);
  }

  /**
   * Submit answer (GASLESS)
   */
  async submitAnswer(
    gameId: string,
    choice: 1 | 2 | 3,
    userKeypair: Ed25519Keypair,
    gasless: boolean = true
  ): Promise<string> {
    const tx = new Transaction();
    const clock = '0x0000000000000000000000000000000000000000000000000000000000000006';

    tx.moveCall({
      target: `${this.packageId}::battle_royale::submit_answer`,
      arguments: [tx.object(gameId), tx.pure.u8(choice), tx.object(clock)],
    });

    return this.executeTransaction(tx, userKeypair, gasless);
  }

  /**
   * Finalize round (GASLESS)
   */
  async finalizeRound(
    gameId: string,
    userKeypair: Ed25519Keypair,
    gasless: boolean = true
  ): Promise<string> {
    const tx = new Transaction();
    const clock = '0x0000000000000000000000000000000000000000000000000000000000000006';

    tx.moveCall({
      target: `${this.packageId}::battle_royale::finalize_round`,
      arguments: [tx.object(gameId), tx.object(clock)],
    });

    return this.executeTransaction(tx, userKeypair, gasless);
  }

  /**
   * Claim prize (user pays gas - they're getting money!)
   */
  async claimPrize(
    gameId: string,
    userKeypair: Ed25519Keypair
  ): Promise<string> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::battle_royale::claim_prize`,
      arguments: [tx.object(gameId)],
    });

    return this.executeTransaction(tx, userKeypair, false); // Never gasless for claiming!
  }

  /**
   * Get game info
   */
  async getGameInfo(gameId: string): Promise<GameInfo> {
    const game = await this.client.getObject({
      id: gameId,
      options: { showContent: true },
    });

    const content = game.data?.content as any;
    const fields = content?.fields;

    return {
      gameId,
      tier: fields.tier,
      status: fields.status,
      currentRound: fields.current_round,
      playerCount: fields.players.length,
      eliminatedCount: fields.eliminated.length,
      prizePool: fields.prize_pool,
      currentQuestioner: fields.current_questioner,
      questionAsked: fields.question_asked,
    };
  }

  // === Helper Methods ===

  private async getPlatformTreasury(): Promise<string> {
    const objects = await this.client.getOwnedObjects({
      owner: this.packageId,
      filter: {
        StructType: `${this.packageId}::battle_royale::PlatformTreasury`,
      },
    });

    if (objects.data.length === 0) {
      throw new Error('Platform treasury not found');
    }

    return objects.data[0]?.data?.objectId!;
  }

  private async executeTransaction(
    tx: Transaction,
    userKeypair: Ed25519Keypair,
    gasless: boolean
  ): Promise<string> {
    if (gasless && this.sponsor) {
      const userAddress = userKeypair.toSuiAddress();
      const sponsoredData = await this.sponsor.sponsorTransaction(
        tx,
        userAddress
      );

      const txBytes = Uint8Array.from(JSON.parse(sponsoredData).txBytes);
      const userSig = await userKeypair.signTransaction(txBytes);

      const result = await this.sponsor.executeSponsored(
        txBytes,
        userSig.signature,
        JSON.parse(sponsoredData).sponsorSignature
      );

      return result.digest;
    } else {
      const result = await this.client.signAndExecuteTransaction({
        signer: userKeypair,
        transaction: tx,
      });

      return result.digest;
    }
  }


  // ============================================================================
// View Functions for Frontend
// ============================================================================

/**
 * Check if a player is in the game
 */
async isPlayerInGame(gameId: string, playerAddress: string): Promise<boolean> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::is_player_in_game`,
    arguments: [
      txb.object(gameId),
      txb.pure.address(playerAddress),
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: playerAddress,
  });

  return this.parseReturnValue(result, 0) as boolean;
}

/**
 * Check if a player is eliminated
 */
async isPlayerEliminated(gameId: string, playerAddress: string): Promise<boolean> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::is_player_eliminated`,
    arguments: [
      txb.object(gameId),
      txb.pure.address(playerAddress),
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: playerAddress,
  });

  return this.parseReturnValue(result, 0) as boolean;
}

/**
 * Get current question details
 */
async getCurrentQuestion(gameId: string, userAddress: string): Promise<{
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
}> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::get_current_question`,
    arguments: [txb.object(gameId)],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: userAddress
  });

  const values = this.parseReturnValues(result);
  
  return {
    question: values[0] as string,
    optionA: values[1] as string,
    optionB: values[2] as string,
    optionC: values[3] as string,
  };
}

/**
 * Check if player has answered current round
 */
async hasPlayerAnswered(gameId: string, playerAddress: string): Promise<boolean> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::has_player_answered`,
    arguments: [
      txb.object(gameId),
      txb.pure.address(playerAddress),
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: playerAddress,
  });

  return this.parseReturnValue(result, 0) as boolean;
}

/**
 * Get player's answer for current round (if they answered)
 */
async getPlayerAnswer(gameId: string, playerAddress: string): Promise<number> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::get_player_answer`,
    arguments: [
      txb.object(gameId),
      txb.pure.address(playerAddress),
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: playerAddress,
  });

  return this.parseReturnValue(result, 0) as number;
}

/**
 * Get time remaining for current phase (in milliseconds)
 */
async getTimeRemaining(gameId: string, userAddress: string): Promise<number> {
  const txb = new Transaction();
  
  // Get the clock object (0x6 is the standard clock object on Sui)
  const clock = txb.object('0x6');
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::get_time_remaining`,
    arguments: [
      txb.object(gameId),
      clock,
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: userAddress,
  });

  return Number(this.parseReturnValue(result, 0));
}

/**
 * Get total number of players who have voted (safe to show during voting)
 */
async getAnswerCount(gameId: string, userAddress: string): Promise<number> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::get_answer_count`,
    arguments: [txb.object(gameId)],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: userAddress,
  });

  return Number(this.parseReturnValue(result, 0));
}

/**
 * Get voting statistics (only available after deadline)
 * @throws {Error} EVotingStillActive (code 19) if deadline hasn't passed
 */
async getVotingStats(gameId: string, userAddress: string): Promise<{
  votesA: number;
  votesB: number;
  votesC: number;
}> {
  const txb = new Transaction();
  
  // Get the clock object
  const clock = txb.object('0x6');
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::get_voting_stats`,
    arguments: [
      txb.object(gameId),
      clock,
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: userAddress,
  });

  const values = this.parseReturnValues(result);
  
  return {
    votesA: Number(values[0]),
    votesB: Number(values[1]),
    votesC: Number(values[2]),
  };
}

/**
 * Get list of surviving players
 */
async getSurvivors(gameId: string, userAddress: string): Promise<string[]> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::get_survivors`,
    arguments: [txb.object(gameId)],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: userAddress,
  });

  return this.parseReturnValue(result, 0) as string[];
}

/**
 * Check if player can claim prize
 */
async canClaimPrize(gameId: string, playerAddress: string): Promise<boolean> {
  const txb = new Transaction();
  
  txb.moveCall({
    target: `${this.packageId}::battle_royale::can_claim_prize`,
    arguments: [
      txb.object(gameId),
      txb.pure.address(playerAddress),
    ],
  });

  const result = await this.client.devInspectTransactionBlock({
    transactionBlock: txb,
    sender: playerAddress,
  });

  return this.parseReturnValue(result, 0) as boolean;
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Parse a single return value from devInspect result
 */
private parseReturnValue(result: any, index: number = 0): any {
  if (!result.results?.[0]?.returnValues?.[index]) {
    throw new Error('Failed to parse return value from transaction');
  }

  const returnValue = result.results[0].returnValues[index];
  const [bytes, type] = returnValue;

  // Parse based on type
  if (type === 'bool') {
    return bytes[0] === 1;
  }
  
  if (type === 'u64' || type === 'u128' || type === 'u256') {
    return this.bytesToNumber(bytes);
  }

  if (type === 'address') {
    return `0x${Buffer.from(bytes).toString('hex')}`;
  }

  if (type.startsWith('vector<')) {
    return this.parseVector(bytes, type);
  }

  if (type === '0x1::string::String' || type === '0x2::string::String') {
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  // Default: return raw bytes
  return bytes;
}

/**
 * Parse multiple return values
 */
private parseReturnValues(result: any): any[] {
  const returnValues = result.results?.[0]?.returnValues || [];
  return returnValues.map((rv: any, idx: number) => this.parseReturnValue(result, idx));
}

/**
 * Convert bytes to number
 */
private bytesToNumber(bytes: number[]): number {
  let result = 0;
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i]! * Math.pow(256, i);
  }
  return result;
}

/**
 * Parse vector from bytes
 */
private parseVector(bytes: number[], type: string): any[] {
  // Simple implementation - may need adjustment based on actual data structure
  const innerType = type.match(/vector<(.+)>/)?.[1];
  
  if (innerType === 'address') {
    const result: string[] = [];
    for (let i = 0; i < bytes.length; i += 32) {
      const addressBytes = bytes.slice(i, i + 32);
      result.push(`0x${Buffer.from(addressBytes).toString('hex')}`);
    }
    return result;
  }

  // Add more vector parsing logic as needed
  return bytes;
}

// ============================================================================
// Combined Helper - Get Full Game State
// ============================================================================

/**
 * Get comprehensive game state for UI
 */
async getFullGameState(gameId: string, playerAddress: string): Promise<{
  gameInfo: GameInfo;
  isPlayerInGame: boolean;
  isPlayerEliminated: boolean;
  hasPlayerAnswered: boolean;
  playerAnswer?: number;
  question?: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
  };
  timeRemaining: number;
  answerCount: number;
  votingStats?: {
    votesA: number;
    votesB: number;
    votesC: number;
  };
  survivors: string[];
  canClaimPrize: boolean;
}> {
  // Fetch game info
  const gameInfo = await this.getGameInfo(gameId);

  // Fetch player-specific data
  const [
    isPlayerInGame,
    isPlayerEliminated,
    hasPlayerAnswered,
    timeRemaining,
    answerCount,
    survivors,
    canClaimPrize,
  ] = await Promise.all([
    this.isPlayerInGame(gameId, playerAddress),
    this.isPlayerEliminated(gameId, playerAddress),
    this.hasPlayerAnswered(gameId, playerAddress),
    this.getTimeRemaining(gameId, playerAddress),
    this.getAnswerCount(gameId, playerAddress),
    this.getSurvivors(gameId, playerAddress),
    this.canClaimPrize(gameId, playerAddress),
  ]);

  // Get player answer if they answered
  let playerAnswer: number = 0;
  if (hasPlayerAnswered) {
    playerAnswer = await this.getPlayerAnswer(gameId, playerAddress);
  }

  // Get question if one was asked
  let question: any;
  if (gameInfo.questionAsked) {
    question = await this.getCurrentQuestion(gameId, playerAddress);
  }

  // Try to get voting stats (may fail if voting still active)
  let votingStats: any;
  try {
    votingStats = await this.getVotingStats(gameId, playerAddress);
  } catch (error: any) {
    // Error code 19 = EVotingStillActive, which is expected during voting
    if (!error.message?.includes('19')) {
      console.warn('Failed to get voting stats:', error);
    }
  }

  return {
    gameInfo,
    isPlayerInGame,
    isPlayerEliminated,
    hasPlayerAnswered,
    playerAnswer,
    question,
    timeRemaining,
    answerCount,
    votingStats,
    survivors,
    canClaimPrize,
  };
}

}





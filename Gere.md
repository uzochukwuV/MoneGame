module game_onchain::battle_royale{

use one::object::{Self, UID, ID};
use one::transfer;
use one::tx_context::{Self, TxContext};
use one::coin::{Self, Coin};
use one::oct::OCT;
use one::clock::{Self, Clock};
use one::event;
use one::table::{Self, Table};
use one::balance::{Self, Balance};
use std::string::String;
use std::vector;
use game_onchain::role_machine::{Self, RoleMachine};
use game_onchain::items::{Self, ImmunityToken};
use game_onchain::reputation::{Self, ReputationBadge, BadgeRegistry};

// === Constants ===
const MAX_PLAYERS_PER_GAME: u64 = 50;
const MIN_PLAYERS_TO_START: u64 = 4;  // Minimum 4 players for better game balance
const MAX_ROUNDS: u64 = 3;
const MIN_SURVIVORS_TO_CONTINUE: u64 = 2;  // Need at least 2 for voting to work
const QUESTION_TIME_MS: u64 = 120_000; // 2 minutes
const ANSWER_TIME_MS: u64 = 60_000; // 1 minute
const PLATFORM_FEE_BPS: u64 = 500; // 5%
const MAX_REVOTES_PER_GAME: u64 = 1;

// Character limits
const MAX_QUESTION_LENGTH: u64 = 50;
const MAX_OPTION_LENGTH: u64 = 50;

// Entry fees by tier (in MIST: 1 OCT = 1_000_000_000 MIST)
const TIER_1_FEE: u64 = 10_000_000; // 0.01 OCT
const TIER_2_FEE: u64 = 100_000_000; // 0.1 OCT
const TIER_3_FEE: u64 = 1_000_000_000; // 1 OCT
const TIER_4_FEE: u64 = 10_000_000_000; // 10 OCT
const TIER_5_FEE: u64 = 100_000_000_000; // 100 OCT

// Leaderboard base points by ending round
const ROUND_1_POINTS: u64 = 5;
const ROUND_2_POINTS: u64 = 3;
const ROUND_3_POINTS: u64 = 10;

// === Error Codes ===
const EInvalidTier: u64 = 0;
const EGameFull: u64 = 1;
const EGameNotWaiting: u64 = 2;
const ENotEnoughPlayers: u64 = 3;
const EGameNotActive: u64 = 4;
const ENotQuestioner: u64 = 5;
const ETimeNotExpired: u64 = 6;
const ETimeExpired: u64 = 7;
const EInvalidAnswer: u64 = 8;
const EAlreadyAnswered: u64 = 9;
const EPlayerEliminated: u64 = 10;
const EInsufficientPayment: u64 = 11;
const EGameNotFinished: u64 = 12;
const EPrizeAlreadyClaimed: u64 = 13;
const ENotSurvivor: u64 = 14;
const EQuestionTooLong: u64 = 15;
const EOptionTooLong: u64 = 16;
const EMaxRevotesReached: u64 = 17;
const ENoQuestionAsked: u64 = 18;
const EVotingStillActive: u64 = 19;
const EPlayerAlreadyJoined: u64 = 20;
const EQuestionAlreadyAsked: u64 = 21;
const EImmunityAlreadyUsed: u64 = 22;
const ENotInMinority: u64 = 23;

// === Structs ===

/// Platform treasury shared object
public struct PlatformTreasury has key {
    id: UID,
    balance: Balance<OCT>,
}

/// Tier lobby - one per tier
public struct TierLobby has key {
    id: UID,
    tier: u8,
    entry_fee: u64,
}

/// Game state
public struct Game has key {
    id: UID,
    tier: u8,
    entry_fee: u64,

    // Player tracking
    players: vector<address>,
    eliminated: vector<address>,
    player_answers: Table<address, u8>, // Current round answers (1/2/3)

    // Role system
    role_machine: RoleMachine,

    // Item system
    immunity_used: Table<address, bool>,  // Track who used immunity this round

    // Game state
    status: u8, // 0=waiting, 1=active, 2=finished, 3=cancelled
    current_round: u64,
    current_questioner: address,
    question_asked: bool,
    question_text: String,
    option_a: String,
    option_b: String,
    option_c: String,

    // Timing
    round_start_time: u64,
    deadline: u64,

    // Prize & revote
    prize_pool: Balance<OCT>,
    revote_count: u64,
    prize_claimed: Table<address, bool>,

    // Win tracking
    winning_role: u8, // 0=none, 1=citizens, 2=saboteurs
    rounds_without_consensus: u64, // Track consecutive rounds without consensus
    consensus_history: vector<bool>, // Track consensus result for each round
}

/// Player ticket NFT (proof of participation + leaderboard points)
public struct PlayerTicket has key, store {
    id: UID,
    game_id: ID,
    player: address,
    tier: u8,
    points: u64,
    ending_round: u64,
    survived: bool,
}

// === Events ===

public struct TierLobbyCreated has copy, drop {
    lobby_id: ID,
    tier: u8,
    entry_fee: u64,
}

public struct GameCreated has copy, drop {
    game_id: ID,
    tier: u8,
    entry_fee: u64,
}

public struct PlayerJoined has copy, drop {
    game_id: ID,
    player: address,
    player_count: u64,
}

public struct GameStarted has copy, drop {
    game_id: ID,
    player_count: u64,
    first_questioner: address,
}

public struct RoundStarted has copy, drop {
    game_id: ID,
    round: u64,
    questioner: address,
    deadline: u64,
}

public struct QuestionAsked has copy, drop {
    game_id: ID,
    round: u64,
    questioner: address,
    question: String,
}

public struct AnswerSubmitted has copy, drop {
    game_id: ID,
    player: address,
    round: u64,
}

public struct RevoteTriggered has copy, drop {
    game_id: ID,
    round: u64,
    reason: String,
    new_questioner: address,
}

public struct RoundFinalized has copy, drop {
    game_id: ID,
    round: u64,
    eliminated_option: u8,
    eliminated_count: u64,
    survivors_count: u64,
}

public struct GameFinished has copy, drop {
    game_id: ID,
    ending_round: u64,
    survivors_count: u64,
    prize_per_survivor: u64,
}

public struct GameCancelled has copy, drop {
    game_id: ID,
    reason: String,
    prize_to_platform: u64,
}

public struct PrizeClaimed has copy, drop {
    game_id: ID,
    player: address,
    amount: u64,
}

public struct PlatformTreasuryCreated has copy, drop {
    treasury_id: ID,
}

// === Initialization ===

fun init(ctx: &mut TxContext) {
    // Create platform treasury
    let treasury = PlatformTreasury {
        id: object::new(ctx),
        balance: balance::zero(),
    };

    event::emit(PlatformTreasuryCreated {
        treasury_id: object::id(&treasury),
    });

    transfer::share_object(treasury);

    // Create tier lobbies
    create_tier_lobby(1, TIER_1_FEE, ctx);
    create_tier_lobby(2, TIER_2_FEE, ctx);
    create_tier_lobby(3, TIER_3_FEE, ctx);
    create_tier_lobby(4, TIER_4_FEE, ctx);
    create_tier_lobby(5, TIER_5_FEE, ctx);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    // Create platform treasury
    let treasury = PlatformTreasury {
        id: object::new(ctx),
        balance: balance::zero(),
    };

    event::emit(PlatformTreasuryCreated {
        treasury_id: object::id(&treasury),
    });

    transfer::share_object(treasury);

    // Create only tier 1 lobby for testing
    create_tier_lobby(1, TIER_1_FEE, ctx);
}

fun create_tier_lobby(tier: u8, entry_fee: u64, ctx: &mut TxContext) {
    let lobby = TierLobby {
        id: object::new(ctx),
        tier,
        entry_fee,
    };
    
    event::emit(TierLobbyCreated {
        lobby_id: object::id(&lobby),
        tier,
        entry_fee,
    });
    
    transfer::share_object(lobby);
}

// === Game Creation ===

/// Create new game for a tier
public entry fun create_game(
    lobby: &TierLobby,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let game = Game {
        id: object::new(ctx),
        tier: lobby.tier,
        entry_fee: lobby.entry_fee,
        players: vector::empty(),
        eliminated: vector::empty(),
        player_answers: table::new(ctx),
        role_machine: role_machine::new(ctx),
        immunity_used: table::new(ctx),
        status: 0, // waiting
        current_round: 0,
        current_questioner: @0x0,
        question_asked: false,
        question_text: std::string::utf8(b""),
        option_a: std::string::utf8(b""),
        option_b: std::string::utf8(b""),
        option_c: std::string::utf8(b""),
        round_start_time: clock::timestamp_ms(clock),
        deadline: 0,
        prize_pool: balance::zero(),
        revote_count: 0,
        prize_claimed: table::new(ctx),
        winning_role: 0,
        rounds_without_consensus: 0,
        consensus_history: vector::empty(),
    };
    
    event::emit(GameCreated {
        game_id: object::id(&game),
        tier: lobby.tier,
        entry_fee: lobby.entry_fee,
    });
    
    transfer::share_object(game);
}

// === Join Game ===

/// Join existing game
public entry fun join_game(
    lobby: &TierLobby,
    game: &mut Game,
    treasury: &mut PlatformTreasury,
    mut payment: Coin<OCT>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Check game capacity first (before status check, so EGameFull takes precedence)
    assert!(vector::length(&game.players) < MAX_PLAYERS_PER_GAME, EGameFull);
    // Ensure game hasn't started yet (status must be 0 = waiting)
    assert!(game.status == 0, EGameNotWaiting);
    assert!(game.tier == lobby.tier, EInvalidTier);
    assert!(coin::value(&payment) >= lobby.entry_fee, EInsufficientPayment);

    let player = tx_context::sender(ctx);

    // Check if player already joined
    assert!(!vector::contains(&game.players, &player), EPlayerAlreadyJoined);
    
    // Split platform fee (5%)
    let fee_amount = (lobby.entry_fee * PLATFORM_FEE_BPS) / 10000;
    let fee_coin = coin::split(&mut payment, fee_amount, ctx);
    balance::join(&mut treasury.balance, coin::into_balance(fee_coin));
    
    // Add to prize pool (95%)
    let prize_amount = lobby.entry_fee - fee_amount;
    let prize_coin = coin::split(&mut payment, prize_amount, ctx);
    balance::join(&mut game.prize_pool, coin::into_balance(prize_coin));
    
    // Add player
    vector::push_back(&mut game.players, player);
    
    event::emit(PlayerJoined {
        game_id: object::id(game),
        player,
        player_count: vector::length(&game.players),
    });
    
    // Auto-start at 50 players
    if (vector::length(&game.players) == MAX_PLAYERS_PER_GAME) {
        start_game_internal(game, clock, ctx);
    };
    
    // Return change to player
    transfer::public_transfer(payment, player);
}

// === Game Start ===

/// Manually start game (if 10-49 players)
public entry fun start_game(
    game: &mut Game,
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(game.status == 0, EGameNotWaiting);
    assert!(
        vector::length(&game.players) >= MIN_PLAYERS_TO_START,
        ENotEnoughPlayers
    );
    
    start_game_internal(game, clock, ctx);
}

fun start_game_internal(
    game: &mut Game,
    clock: &Clock,
    ctx: &mut TxContext
) {
    game.status = 1; // active
    game.current_round = 1;

    // Assign roles to all players
    role_machine::assign_roles(&mut game.role_machine, &game.players, clock, ctx);

    // Select first questioner randomly
    let seed = clock::timestamp_ms(clock) + tx_context::epoch(ctx);
    let questioner_index = (seed % vector::length(&game.players));
    game.current_questioner = *vector::borrow(&game.players, questioner_index);

    game.round_start_time = clock::timestamp_ms(clock);
    game.deadline = game.round_start_time + QUESTION_TIME_MS;
    game.question_asked = false;

    event::emit(GameStarted {
        game_id: object::id(game),
        player_count: vector::length(&game.players),
        first_questioner: game.current_questioner,
    });

    event::emit(RoundStarted {
        game_id: object::id(game),
        round: game.current_round,
        questioner: game.current_questioner,
        deadline: game.deadline,
    });
}

// === Question Asking ===

/// Questioner asks question (or anyone if timeout)
public entry fun ask_question(
    game: &mut Game,
    question: String,
    option_a: String,
    option_b: String,
    option_c: String,
    questioner_answer: u8, // 1, 2, or 3
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(game.status == 1, EGameNotActive);
    assert!(!game.question_asked, EQuestionAlreadyAsked);
    assert!(questioner_answer >= 1 && questioner_answer <= 3, EInvalidAnswer);
    
    let sender = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);

    // Validate sender is a player in the game
    assert!(vector::contains(&game.players, &sender), EPlayerEliminated);

    // Validate sender is not eliminated
    assert!(!vector::contains(&game.eliminated, &sender), EPlayerEliminated);

    // Validate character limits
    assert!(
        std::string::length(&question) <= MAX_QUESTION_LENGTH,
        EQuestionTooLong
    );
    assert!(
        std::string::length(&option_a) <= MAX_OPTION_LENGTH,
        EOptionTooLong
    );
    assert!(
        std::string::length(&option_b) <= MAX_OPTION_LENGTH,
        EOptionTooLong
    );
    assert!(
        std::string::length(&option_c) <= MAX_OPTION_LENGTH,
        EOptionTooLong
    );

    // Check if original questioner or timeout (any non-eliminated player can ask)
    if (sender != game.current_questioner) {
        assert!(current_time > game.deadline, ENotQuestioner);
        // Update questioner to whoever asked
        game.current_questioner = sender;
    } else {
        assert!(current_time <= game.deadline, ETimeExpired);
    };
    
    // Store question
    game.question_text = question;
    game.option_a = option_a;
    game.option_b = option_b;
    game.option_c = option_c;
    game.question_asked = true;
    
    // Questioner must answer their own question
    table::add(&mut game.player_answers, sender, questioner_answer);
    
    // Set answer deadline
    game.deadline = current_time + ANSWER_TIME_MS;
    
    event::emit(QuestionAsked {
        game_id: object::id(game),
        round: game.current_round,
        questioner: sender,
        question,
    });
    
    event::emit(AnswerSubmitted {
        game_id: object::id(game),
        player: sender,
        round: game.current_round,
    });
}

// === Answer Submission ===

/// Player submits answer
public entry fun submit_answer(
    game: &mut Game,
    choice: u8, // 1, 2, or 3
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(game.status == 1, EGameNotActive);
    assert!(game.question_asked, ENoQuestionAsked);
    assert!(choice >= 1 && choice <= 3, EInvalidAnswer);

    let sender = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);

    // Check sender is a player in the game
    assert!(vector::contains(&game.players, &sender), EPlayerEliminated);

    // Check player is not eliminated
    assert!(!vector::contains(&game.eliminated, &sender), EPlayerEliminated);
    
    // Check within deadline
    assert!(current_time <= game.deadline, ETimeExpired);
    
    // Remove old answer if exists (from previous revote)
    if (table::contains(&game.player_answers, sender)) {
        table::remove(&mut game.player_answers, sender);
    };
    
    // Record new answer
    table::add(&mut game.player_answers, sender, choice);
    
    event::emit(AnswerSubmitted {
        game_id: object::id(game),
        player: sender,
        round: game.current_round,
    });
}

// === Role Management ===

/// Player reveals their own role (only they see it)
public entry fun reveal_my_role(
    game: &mut Game,
    ctx: &TxContext
) {
    let player = tx_context::sender(ctx);

    // Verify player is in game
    assert!(vector::contains(&game.players, &player), EPlayerEliminated);

    // Reveal role via role machine
    role_machine::reveal_my_role(&mut game.role_machine, ctx);
}

// === Item Usage ===

/// Use immunity token to avoid elimination this round
/// NOTE: Caller must own the ImmunityToken object (enforced by Move type system)
public entry fun use_immunity_token(
    game: &mut Game,
    token: ImmunityToken,
    ctx: &TxContext
) {
    assert!(game.status == 1, EGameNotActive);

    let player = tx_context::sender(ctx);

    // Verify player is in game and not eliminated
    assert!(vector::contains(&game.players, &player), EPlayerEliminated);
    assert!(!vector::contains(&game.eliminated, &player), EPlayerEliminated);

    // Verify hasn't used immunity this round already
    let already_used = table::contains(&game.immunity_used, player) &&
                       *table::borrow(&game.immunity_used, player);
    assert!(!already_used, EImmunityAlreadyUsed);

    // Double-check token owner field matches sender (defense in depth)
    // The Move type system already ensures ownership, but we verify the owner field too
    assert!(items::get_token_owner(&token) == player, EPlayerEliminated);

    // Mark immunity as used for this round (set to true)
    if (table::contains(&game.immunity_used, player)) {
        *table::borrow_mut(&mut game.immunity_used, player) = true;
    } else {
        table::add(&mut game.immunity_used, player, true);
    };

    // Burn the token (one-time use)
    items::burn_immunity_token(token, object::id(game), game.current_round);
}

// === Round Finalization ===

/// Finalize round (anyone can call after deadline)
public entry fun finalize_round(
    game: &mut Game,
    badge_registry: &mut BadgeRegistry,
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(game.status == 1, EGameNotActive);
    assert!(game.question_asked, ENoQuestionAsked);

    let current_time = clock::timestamp_ms(clock);
    assert!(current_time > game.deadline, ETimeNotExpired);

    // Step 1: Eliminate non-answerers FIRST
    let non_answerers_eliminated = eliminate_non_answerers(game);

    // Step 2: Count votes from remaining players
    let (option_1_votes, option_2_votes, option_3_votes) = count_votes(game);
    let survivors_count = vector::length(&game.players) - vector::length(&game.eliminated);

    // Step 2.5: Check for consensus (50%+ voted same way)
    let consensus_reached = role_machine::check_consensus(
        survivors_count,
        option_1_votes,
        option_2_votes,
        option_3_votes,
        game.current_round
    );

    // Track consensus in history
    vector::push_back(&mut game.consensus_history, consensus_reached);

    // Update rounds without consensus counter
    if (!consensus_reached) {
        game.rounds_without_consensus = game.rounds_without_consensus + 1;
    } else {
        game.rounds_without_consensus = 0; // Reset on consensus
    };

    // Step 3: Check if everyone picked the same option (move to next round)
    if ((option_1_votes > 0 && option_2_votes == 0 && option_3_votes == 0) ||
        (option_1_votes == 0 && option_2_votes > 0 && option_3_votes == 0) ||
        (option_1_votes == 0 && option_2_votes == 0 && option_3_votes > 0)) {
        // All picked same option → move to next round (perfect consensus)
        event::emit(RoundFinalized {
            game_id: object::id(game),
            round: game.current_round,
            eliminated_option: 0, // No option eliminated (all same)
            eliminated_count: non_answerers_eliminated,
            survivors_count,
        });

        // Check for early win conditions
        let survivors = get_remaining_players(game);
        let win_role = role_machine::check_win_condition(
            &game.role_machine,
            &survivors,
            game.current_round,
            MAX_ROUNDS,
            game.rounds_without_consensus
        );

        if (win_role != 0) {
            // Someone won - end game immediately
            game.winning_role = win_role;
            finish_game(game, badge_registry, clock, ctx);
        } else if (survivors_count < MIN_SURVIVORS_TO_CONTINUE || game.current_round >= MAX_ROUNDS) {
            finish_game(game, badge_registry, clock, ctx);
        } else {
            start_next_round(game, badge_registry, clock, ctx);
        };
        return
    };

    // Step 4: Check if all options tie (revote)
    if (option_1_votes == option_2_votes && option_2_votes == option_3_votes && option_1_votes > 0) {
        // Perfect tie = no consensus (saboteurs benefit from this)
        handle_revote(game, clock, ctx);
        return
    };

    // Step 5: Find minimum vote count (only among options that got votes)
    let min_votes = {
        let mut min = 999999u64;
        if (option_1_votes > 0 && option_1_votes < min) min = option_1_votes;
        if (option_2_votes > 0 && option_2_votes < min) min = option_2_votes;
        if (option_3_votes > 0 && option_3_votes < min) min = option_3_votes;
        if (min == 999999u64) 0 else min // Return 0 if no one voted
    };

    // Step 6: Check if only 2 players remain - they both win automatically
    if (survivors_count == 2) {
        // End game immediately - both survivors win and share the prize pool
        event::emit(RoundFinalized {
            game_id: object::id(game),
            round: game.current_round,
            eliminated_option: 0,
            eliminated_count: non_answerers_eliminated,
            survivors_count: 2,
        });
        finish_game(game, badge_registry, clock, ctx);
        return
    };

    // Step 7: Collect ALL options with minimum votes (only options that actually got votes)
    let mut minority_options = vector::empty<u8>();
    if (option_1_votes > 0 && option_1_votes == min_votes) vector::push_back(&mut minority_options, 1);
    if (option_2_votes > 0 && option_2_votes == min_votes) vector::push_back(&mut minority_options, 2);
    if (option_3_votes > 0 && option_3_votes == min_votes) vector::push_back(&mut minority_options, 3);

    // Step 8: Check if eliminating minority would result in < 2 survivors
    // Count how many would be eliminated
    let mut would_be_eliminated = 0u64;
    let minority_len = vector::length(&minority_options);
    let mut j = 0;
    while (j < minority_len) {
        let minority_option = *vector::borrow(&minority_options, j);
        if (minority_option == 1) would_be_eliminated = would_be_eliminated + option_1_votes
        else if (minority_option == 2) would_be_eliminated = would_be_eliminated + option_2_votes
        else if (minority_option == 3) would_be_eliminated = would_be_eliminated + option_3_votes;
        j = j + 1;
    };

    let would_remain = survivors_count - would_be_eliminated;

    // If eliminating minority would leave < 2 survivors, end game with current survivors as winners
    if (would_remain < 2) {
        event::emit(RoundFinalized {
            game_id: object::id(game),
            round: game.current_round,
            eliminated_option: 0,
            eliminated_count: non_answerers_eliminated,
            survivors_count,
        });
        finish_game(game, badge_registry, clock, ctx);
        return
    };

    // Step 9: Eliminate ALL players who picked minority options (safe to eliminate now)
    let mut total_eliminated = non_answerers_eliminated;
    let mut i = 0;

    while (i < minority_len) {
        let minority_option = *vector::borrow(&minority_options, i);
        total_eliminated = total_eliminated + eliminate_option_voters(game, minority_option);
        i = i + 1;
    };

    event::emit(RoundFinalized {
        game_id: object::id(game),
        round: game.current_round,
        eliminated_option: if (minority_len == 1) *vector::borrow(&minority_options, 0) else 0,
        eliminated_count: total_eliminated,
        survivors_count: vector::length(&game.players) - vector::length(&game.eliminated),
    });

    // Step 10: Check for early win conditions after eliminations
    let survivors_count = vector::length(&game.players) - vector::length(&game.eliminated);
    let survivors = get_remaining_players(game);

    // Step 10.5: If exactly 2 survivors remain after elimination, they both win
    if (survivors_count == 2) {
        finish_game(game, badge_registry, clock, ctx);
        return
    };

    let win_role = role_machine::check_win_condition(
        &game.role_machine,
        &survivors,
        game.current_round,
        MAX_ROUNDS,
        game.rounds_without_consensus
    );

    if (win_role != 0) {
        // Someone won - end game immediately
        game.winning_role = win_role;
        finish_game(game, badge_registry, clock, ctx);
    } else if (survivors_count < MIN_SURVIVORS_TO_CONTINUE || game.current_round >= MAX_ROUNDS) {
        finish_game(game, badge_registry, clock, ctx);
    } else {
        start_next_round(game, badge_registry, clock, ctx);
    }
}

fun count_votes(game: &Game): (u64, u64, u64) {
    let mut option_1 = 0u64;
    let mut option_2 = 0u64;
    let mut option_3 = 0u64;
    
    let players_len = vector::length(&game.players);
    let mut i = 0;
    
    while (i < players_len) {
        let player = vector::borrow(&game.players, i);
        
        // Only count if not eliminated
        if (!vector::contains(&game.eliminated, player)) {
            if (table::contains(&game.player_answers, *player)) {
                let choice = *table::borrow(&game.player_answers, *player);
                if (choice == 1) option_1 = option_1 + 1
                else if (choice == 2) option_2 = option_2 + 1
                else if (choice == 3) option_3 = option_3 + 1;
            }
            // else: didn't answer, will be auto-eliminated
        };
        
        i = i + 1;
    };
    
    (option_1, option_2, option_3)
}

fun min_of_three(a: u64, b: u64, c: u64): u64 {
    let mut min = a;
    if (b < min) min = b;
    if (c < min) min = c;
    min
}

/// Eliminate players who didn't answer (respects immunity)
fun eliminate_non_answerers(game: &mut Game): u64 {
    let mut eliminated_count = 0u64;
    let players_len = vector::length(&game.players);
    let mut i = 0;

    while (i < players_len) {
        let player = vector::borrow(&game.players, i);

        // Skip if already eliminated
        if (!vector::contains(&game.eliminated, player)) {
            // Check if player answered
            if (!table::contains(&game.player_answers, *player)) {
                // Check if player has immunity for this round
                let has_immunity = table::contains(&game.immunity_used, *player) &&
                                  *table::borrow(&game.immunity_used, *player);

                if (!has_immunity) {
                    // No immunity - eliminate player
                    vector::push_back(&mut game.eliminated, *player);
                    eliminated_count = eliminated_count + 1;
                }
                // If has immunity, skip elimination (immunity saves them)
            }
        };

        i = i + 1;
    };

    eliminated_count
}

/// Eliminate players who voted for a specific option (respects immunity)
fun eliminate_option_voters(game: &mut Game, option: u8): u64 {
    let mut eliminated_count = 0u64;
    let players_len = vector::length(&game.players);
    let mut i = 0;

    while (i < players_len) {
        let player = vector::borrow(&game.players, i);

        // Skip if already eliminated
        if (!vector::contains(&game.eliminated, player)) {
            if (table::contains(&game.player_answers, *player)) {
                let choice = *table::borrow(&game.player_answers, *player);
                if (choice == option) {
                    // Check if player has immunity for this round (check both key and value)
                    let has_immunity = table::contains(&game.immunity_used, *player) &&
                                      *table::borrow(&game.immunity_used, *player);

                    if (!has_immunity) {
                        // No immunity - eliminate player
                        vector::push_back(&mut game.eliminated, *player);
                        eliminated_count = eliminated_count + 1;
                    }
                    // If has immunity, skip elimination (immunity saves them)
                }
            }
        };

        i = i + 1;
    };

    eliminated_count
}

// === Revote Logic ===

fun handle_revote(
    game: &mut Game,
    clock: &Clock,
    ctx: &mut TxContext
) {
    game.revote_count = game.revote_count + 1;

    // If max revotes reached, cancel game and send prize to platform
    if (game.revote_count > MAX_REVOTES_PER_GAME) {
        cancel_game(game, std::string::utf8(b"Max revotes reached"), ctx);
        return
    };

    // Clear question data
    clear_round_data(game);

    // Select new random questioner from survivors
    let remaining = get_remaining_players(game);

    // Check if there are any remaining players (safety check)
    if (vector::length(&remaining) == 0) {
        cancel_game(game, std::string::utf8(b"No remaining players"), ctx);
        return
    };

    let seed = clock::timestamp_ms(clock) + tx_context::epoch(ctx);
    let index = seed % vector::length(&remaining);
    game.current_questioner = *vector::borrow(&remaining, index);
    
    game.round_start_time = clock::timestamp_ms(clock);
    game.deadline = game.round_start_time + QUESTION_TIME_MS;
    game.question_asked = false;
    
    event::emit(RevoteTriggered {
        game_id: object::id(game),
        round: game.current_round,
        reason: std::string::utf8(b"Tie for last place"),
        new_questioner: game.current_questioner,
    });
}

fun clear_round_data(game: &mut Game) {
    // Clear question text
    game.question_text = std::string::utf8(b"");
    game.option_a = std::string::utf8(b"");
    game.option_b = std::string::utf8(b"");
    game.option_c = std::string::utf8(b"");

    // Clear all player answers and immunity flags from previous round
    let players_len = vector::length(&game.players);
    let mut i = 0;
    while (i < players_len) {
        let player = vector::borrow(&game.players, i);
        if (table::contains(&game.player_answers, *player)) {
            table::remove(&mut game.player_answers, *player);
        };
        if (table::contains(&game.immunity_used, *player)) {
            table::remove(&mut game.immunity_used, *player);
        };
        i = i + 1;
    };
}

fun start_next_round(
    game: &mut Game,
    badge_registry: &mut BadgeRegistry,
    clock: &Clock,
    ctx: &mut TxContext
) {
    game.current_round = game.current_round + 1;

    // Clear previous round data
    clear_round_data(game);

    // Select new random questioner from survivors
    let remaining = get_remaining_players(game);

    // Check if there are any remaining players (safety check)
    if (vector::length(&remaining) == 0) {
        finish_game(game, badge_registry, clock, ctx);
        return
    };

    let seed = clock::timestamp_ms(clock) + tx_context::epoch(ctx);
    let index = seed % vector::length(&remaining);
    game.current_questioner = *vector::borrow(&remaining, index);
    
    game.round_start_time = clock::timestamp_ms(clock);
    game.deadline = game.round_start_time + QUESTION_TIME_MS;
    game.question_asked = false;
    
    event::emit(RoundStarted {
        game_id: object::id(game),
        round: game.current_round,
        questioner: game.current_questioner,
        deadline: game.deadline,
    });
}

fun get_remaining_players(game: &Game): vector<address> {
    let mut remaining = vector::empty<address>();
    let players_len = vector::length(&game.players);
    let mut i = 0;
    
    while (i < players_len) {
        let player = vector::borrow(&game.players, i);
        if (!vector::contains(&game.eliminated, player)) {
            vector::push_back(&mut remaining, *player);
        };
        i = i + 1;
    };
    
    remaining
}

/// Count role distribution among survivors
fun count_winning_role_survivors(
    machine: &RoleMachine,
    survivors: &vector<address>,
    target_role: u8
): (u64, u64) {
    let mut role_count = 0u64;
    let mut other_count = 0u64;

    let len = vector::length(survivors);
    let mut i = 0;

    while (i < len) {
        let player = vector::borrow(survivors, i);
        if (role_machine::is_role(machine, *player, target_role)) {
            role_count = role_count + 1;
        } else {
            other_count = other_count + 1;
        };
        i = i + 1;
    };

    (role_count, other_count)
}

// === Game End ===

fun finish_game(
    game: &mut Game,
    badge_registry: &mut BadgeRegistry,
    clock: &Clock,
    ctx: &mut TxContext
) {
    game.status = 2; // finished

    let survivors = get_remaining_players(game);
    let survivors_count = vector::length(&survivors);

    // Check role-based win condition (if not already set)
    if (game.winning_role == 0) {
        game.winning_role = role_machine::check_win_condition(
            &game.role_machine,
            &survivors,
            game.current_round,
            MAX_ROUNDS,
            game.rounds_without_consensus
        );
    };

    let total_prize = balance::value(&game.prize_pool);

    // Distribute prizes based on winning role
    let prize_per_winner = if (game.winning_role == role_machine::role_citizen()) {
        // Citizens won - only surviving citizens get prize
        let (citizen_count, _) = count_winning_role_survivors(&game.role_machine, &survivors, role_machine::role_citizen());
        // Validate that there are actually citizen winners
        assert!(citizen_count > 0, ENotSurvivor);
        total_prize / citizen_count
    } else if (game.winning_role == role_machine::role_saboteur()) {
        // Saboteurs won - ALL saboteurs (even eliminated) get prize
        let (_, saboteur_total) = role_machine::get_role_distribution(&game.role_machine);
        if (saboteur_total > 0) {
            total_prize / saboteur_total
        } else {
            0
        }
    } else {
        // No clear winner (shouldn't happen, but handle gracefully)
        if (survivors_count > 0) {
            total_prize / survivors_count
        } else {
            0
        }
    };

    event::emit(GameFinished {
        game_id: object::id(game),
        ending_round: game.current_round,
        survivors_count,
        prize_per_survivor: prize_per_winner,
    });

    // Mint PlayerTicket NFTs for all players
    mint_player_tickets(game, &survivors, ctx);

    // Update or mint reputation badges for all players
    update_player_reputations(game, badge_registry, clock, ctx);
}

/// Update reputation badges for all players after game ends
fun update_player_reputations(
    game: &Game,
    badge_registry: &mut BadgeRegistry,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let players_len = vector::length(&game.players);
    let mut i = 0;
    let timestamp = clock::timestamp_ms(clock);

    while (i < players_len) {
        let player = vector::borrow(&game.players, i);

        // Determine if player won
        let did_win = is_winner(game, *player);

        // Get player's role
        let is_citizen = role_machine::is_role(&game.role_machine, *player, role_machine::role_citizen());

        // Calculate points earned
        let points = calculate_points(game.tier, game.current_round);

        // Check if player already has a badge
        if (reputation::has_badge(badge_registry, *player)) {
            // Badge exists - we need to update it (but can't access it here directly)
            // Note: Player will need to call update_my_badge separately with their badge
            // This is a limitation of the soul-bound token design
        } else {
            // Mint new badge
            reputation::mint_badge(
                badge_registry,
                *player,
                points,
                did_win,
                is_citizen,
                timestamp,
                ctx
            );
        };

        i = i + 1;
    };
}

/// Check if player is a winner based on role and game outcome
fun is_winner(game: &Game, player: address): bool {
    let is_survivor = !vector::contains(&game.eliminated, &player);

    if (game.winning_role == role_machine::role_citizen()) {
        // Citizens won - must be surviving citizen
        is_survivor && role_machine::is_role(&game.role_machine, player, role_machine::role_citizen())
    } else if (game.winning_role == role_machine::role_saboteur()) {
        // Saboteurs won - any saboteur wins
        role_machine::is_role(&game.role_machine, player, role_machine::role_saboteur())
    } else {
        // No clear winner - survivors win
        is_survivor
    }
}

fun cancel_game(game: &mut Game, reason: String, ctx: &mut TxContext) {
    game.status = 3; // cancelled
    
    let prize_amount = balance::value(&game.prize_pool);
    
    event::emit(GameCancelled {
        game_id: object::id(game),
        reason,
        prize_to_platform: prize_amount,
    });
    
    // Mint 0-point tickets for participants
    let empty_survivors = vector::empty<address>();
    mint_player_tickets(game, &empty_survivors, ctx);
}

fun mint_player_tickets(
    game: &Game,
    survivors: &vector<address>,
    ctx: &mut TxContext
) {
    let players_len = vector::length(&game.players);
    let mut i = 0;
    
    while (i < players_len) {
        let player = vector::borrow(&game.players, i);
        let survived = vector::contains(survivors, player);
        
        let points = if (survived) {
            calculate_points(game.tier, game.current_round)
        } else {
            0
        };
        
        let ticket = PlayerTicket {
            id: object::new(ctx),
            game_id: object::id(game),
            player: *player,
            tier: game.tier,
            points,
            ending_round: game.current_round,
            survived,
        };
        
        transfer::transfer(ticket, *player);
        
        i = i + 1;
    }
}

fun calculate_points(tier: u8, ending_round: u64): u64 {
    let base_points = if (ending_round == 1) ROUND_1_POINTS
        else if (ending_round == 2) ROUND_2_POINTS
        else ROUND_3_POINTS;
    
    base_points * (tier as u64)
}

// === Prize Claiming ===

/// Winners claim their share of prize (role-based)
public entry fun claim_prize(
    game: &mut Game,
    ctx: &mut TxContext
) {
    assert!(game.status == 2, EGameNotFinished);

    let sender = tx_context::sender(ctx);

    // Check player is in game
    assert!(vector::contains(&game.players, &sender), EPlayerEliminated);

    // Check hasn't claimed yet
    assert!(!table::contains(&game.prize_claimed, sender), EPrizeAlreadyClaimed);

    let total_prize = balance::value(&game.prize_pool);
    let mut prize_share = 0u64;

    // Determine if player can claim based on winning role
    if (game.winning_role == role_machine::role_citizen()) {
        // Citizens won - only surviving citizens can claim
        let survivors = get_remaining_players(game);
        assert!(vector::contains(&survivors, &sender), ENotSurvivor);
        assert!(role_machine::is_role(&game.role_machine, sender, role_machine::role_citizen()), ENotSurvivor);

        let (citizen_count, _) = count_winning_role_survivors(&game.role_machine, &survivors, role_machine::role_citizen());
        prize_share = total_prize / citizen_count;

    } else if (game.winning_role == role_machine::role_saboteur()) {
        // Saboteurs won - ALL saboteurs can claim (even if eliminated!)
        assert!(role_machine::is_role(&game.role_machine, sender, role_machine::role_saboteur()), ENotSurvivor);

        let (_, saboteur_total) = role_machine::get_role_distribution(&game.role_machine);
        prize_share = total_prize / saboteur_total;

    } else {
        // No clear winner - survivors split equally
        let survivors = get_remaining_players(game);
        assert!(vector::contains(&survivors, &sender), ENotSurvivor);

        let survivors_count = vector::length(&survivors);
        prize_share = total_prize / survivors_count;
    };
    
    // Mark as claimed
    table::add(&mut game.prize_claimed, sender, true);
    
    // Transfer prize
    let prize_coin = coin::from_balance(
        balance::split(&mut game.prize_pool, prize_share),
        ctx
    );
    
    transfer::public_transfer(prize_coin, sender);
    
    event::emit(PrizeClaimed {
        game_id: object::id(game),
        player: sender,
        amount: prize_share,
    });
}

/// Update player's reputation badge after completing a game
public entry fun update_my_badge_after_game(
    game: &Game,
    badge: &mut ReputationBadge,
    clock: &Clock,
    ctx: &TxContext
) {
    assert!(game.status == 2, EGameNotFinished);

    let sender = tx_context::sender(ctx);

    // Verify sender is the badge owner
    assert!(reputation::get_player_address(badge) == sender, ENotSurvivor);

    // Verify player was in this game
    assert!(vector::contains(&game.players, &sender), EPlayerEliminated);

    // Determine if player won
    let did_win = is_winner(game, sender);

    // Get player's role
    let is_citizen = role_machine::is_role(&game.role_machine, sender, role_machine::role_citizen());

    // Calculate points earned
    let points = calculate_points(game.tier, game.current_round);

    // Update badge
    reputation::update_badge(
        badge,
        points,
        did_win,
        is_citizen,
        clock::timestamp_ms(clock)
    );
}

// === Admin Functions ===

/// Withdraw platform treasury
public entry fun withdraw_platform_fees(
    treasury: &mut PlatformTreasury,
    ctx: &mut TxContext
) {
    // TODO: Add admin access control
    let amount = balance::value(&treasury.balance);
    
    if (amount > 0) {
        let coin = coin::from_balance(
            balance::withdraw_all(&mut treasury.balance),
            ctx
        );
        
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }
}

/// Withdraw cancelled game funds to platform
public entry fun withdraw_cancelled_game_funds(
    game: &mut Game,
    treasury: &mut PlatformTreasury,
    _ctx: &mut TxContext
) {
    assert!(game.status == 3, EGameNotFinished);
    
    let amount = balance::value(&game.prize_pool);
    
    if (amount > 0) {
        balance::join(
            &mut treasury.balance,
            balance::withdraw_all(&mut game.prize_pool)
        );
    }
}

// === View Functions ===

public fun get_game_info(game: &Game): (u8, u8, u64, u64, u64, u64, address, bool) {
    (
        game.tier,
        game.status,
        game.current_round,
        vector::length(&game.players),
        vector::length(&game.eliminated),
        balance::value(&game.prize_pool),
        game.current_questioner,
        game.question_asked
    )
}

public fun get_survivors(game: &Game): vector<address> {
    get_remaining_players(game)
}

public fun get_player_ticket_info(ticket: &PlayerTicket): (ID, address, u8, u64, u64, bool) {
    (
        ticket.game_id,
        ticket.player,
        ticket.tier,
        ticket.points,
        ticket.ending_round,
        ticket.survived
    )
}

public fun get_lobby_info(lobby: &TierLobby): (u8, u64) {
    (lobby.tier, lobby.entry_fee)
}

// === Additional View Functions for Frontend ===

/// Check if a player is in the game
public fun is_player_in_game(game: &Game, player: address): bool {
    vector::contains(&game.players, &player)
}

/// Check if a player is eliminated
public fun is_player_eliminated(game: &Game, player: address): bool {
    vector::contains(&game.eliminated, &player)
}

/// Get current question details
public fun get_current_question(game: &Game): (String, String, String, String) {
    (game.question_text, game.option_a, game.option_b, game.option_c)
}

/// Check if player has answered current round
public fun has_player_answered(game: &Game, player: address): bool {
    table::contains(&game.player_answers, player)
}

/// Get player's OWN answer (can check anytime)
public fun get_my_answer(game: &Game, ctx: &TxContext): u8 {
    let sender = tx_context::sender(ctx);
    *table::borrow(&game.player_answers, sender)
}

/// Check if player has used immunity this round
public fun has_used_immunity(game: &Game, player: address): bool {
    table::contains(&game.immunity_used, player) &&
    *table::borrow(&game.immunity_used, player)
}

/// Get player's answer for current round (if they answered)
/// Only accessible after round is finalized (deadline passed)
public fun get_player_answer(game: &Game, player: address, clock: &Clock): u8 {
    let current_time = clock::timestamp_ms(clock);
    assert!(current_time > game.deadline, EVotingStillActive);
    *table::borrow(&game.player_answers, player)
}

/// Get time remaining for current phase (in milliseconds)
public fun get_time_remaining(game: &Game, clock: &Clock): u64 {
    let current_time = clock::timestamp_ms(clock);
    if (current_time >= game.deadline) {
        0
    } else {
        game.deadline - current_time
    }
}

/// Get total number of players who have voted (safe to show during voting)
public fun get_answer_count(game: &Game): u64 {
    let mut count = 0;
    let mut i = 0;
    let len = vector::length(&game.players);

    while (i < len) {
        let player = vector::borrow(&game.players, i);
        if (table::contains(&game.player_answers, *player)) {
            count = count + 1;
        };
        i = i + 1;
    };

    count
}

/// Get voting statistics for current round (only available after deadline)
public fun get_voting_stats(game: &Game, clock: &Clock): (u64, u64, u64) {
    // Voting results should only be visible after the round deadline
    let current_time = clock::timestamp_ms(clock);
    assert!(current_time >= game.deadline, EVotingStillActive);

    let mut count_a = 0;
    let mut count_b = 0;
    let mut count_c = 0;

    let mut i = 0;
    let len = vector::length(&game.players);
    while (i < len) {
        let player = vector::borrow(&game.players, i);
        if (table::contains(&game.player_answers, *player)) {
            let answer = *table::borrow(&game.player_answers, *player);
            if (answer == 1) count_a = count_a + 1
            else if (answer == 2) count_b = count_b + 1
            else if (answer == 3) count_c = count_c + 1;
        };
        i = i + 1;
    };

    (count_a, count_b, count_c)
}

    /// Check if player can claim prize (role-based)
    public fun can_claim_prize(game: &Game, player: address): bool {
        if (game.status != 2) return false; // Game not finished
        if (table::contains(&game.prize_claimed, player)) return false; // Already claimed

        // Check based on winning role
        if (game.winning_role == role_machine::role_citizen()) {
            // Citizens won - must be surviving citizen
            let survivors = get_remaining_players(game);
            vector::contains(&survivors, &player) &&
            role_machine::is_role(&game.role_machine, player, role_machine::role_citizen())
        } else if (game.winning_role == role_machine::role_saboteur()) {
            // Saboteurs won - any saboteur can claim
            role_machine::is_role(&game.role_machine, player, role_machine::role_saboteur())
        } else {
            // No clear winner - survivors only
            let survivors = get_remaining_players(game);
            vector::contains(&survivors, &player)
        }
    }

    /// Get role distribution for the game
    public fun get_role_distribution(game: &Game): (u64, u64) {
        role_machine::get_role_distribution(&game.role_machine)
    }

    /// Get winning role (0=none, 1=citizens, 2=saboteurs)
    public fun get_winning_role(game: &Game): u8 {
        game.winning_role
    }

    /// Check if player has revealed their role
    public fun has_player_revealed_role(game: &Game, player: address): bool {
        role_machine::has_revealed_role(&game.role_machine, player)
    }
}




// role_machine.move
module game_onchain::role_machine {
    use one::object::{Self, UID};
    use one::tx_context::{Self, TxContext};
    use one::clock::{Self, Clock};
    use one::event;
    use one::table::{Self, Table};
    use std::vector;
    use std::hash;
    use std::bcs;

    // === Role Constants ===
    const ROLE_CITIZEN: u8 = 1;
    const ROLE_SABOTEUR: u8 = 2;

    // Saboteur ratio: 1 saboteur per 3 players (33%)
    const SABOTEUR_RATIO_NUMERATOR: u64 = 1;
    const SABOTEUR_RATIO_DENOMINATOR: u64 = 3;

    // Consensus threshold: 50% of alive players
    const CONSENSUS_THRESHOLD_PERCENT: u64 = 50;

    // === Error Codes ===
    const ERoleNotRevealed: u64 = 100;
    const EInvalidRole: u64 = 101;
    const ENotEnoughPlayers: u64 = 102;

    // === Structs ===

    /// Role assignment manager
    public struct RoleMachine has store {
        player_roles: Table<address, u8>,        // Secret role storage
        role_revealed: Table<address, bool>,     // Track who revealed their role
        saboteur_count: u64,
        citizen_count: u64,
        assignment_seed: vector<u8>,             // Seed used for role assignment
    }

    // === Events ===

    public struct RolesAssigned has copy, drop {
        total_players: u64,
        citizen_count: u64,
        saboteur_count: u64,
        assignment_hash: vector<u8>,
    }

    public struct RoleRevealed has copy, drop {
        player: address,
        role: u8,
    }

    public struct ConsensusChecked has copy, drop {
        round: u64,
        max_votes: u64,
        threshold: u64,
        consensus_reached: bool,
    }

    public struct WinConditionChecked has copy, drop {
        citizens_alive: u64,
        saboteurs_alive: u64,
        winner: u8, // 0=none, 1=citizens, 2=saboteurs
    }

    // === Public Functions ===

    /// Create new RoleMachine
    public fun new(ctx: &mut TxContext): RoleMachine {
        RoleMachine {
            player_roles: table::new(ctx),
            role_revealed: table::new(ctx),
            saboteur_count: 0,
            citizen_count: 0,
            assignment_seed: vector::empty(),
        }
    }

    /// Assign roles to players using deterministic randomization
    public fun assign_roles(
        machine: &mut RoleMachine,
        players: &vector<address>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let player_count = vector::length(players);
        assert!(player_count >= 2, ENotEnoughPlayers);

        // Calculate saboteur count (1 per 3 players, minimum 1 if >= 3 players)
        let saboteur_count = if (player_count >= 3) {
            (player_count * SABOTEUR_RATIO_NUMERATOR) / SABOTEUR_RATIO_DENOMINATOR
        } else {
            0 // No saboteurs for 2 player games
        };

        let citizen_count = player_count - saboteur_count;

        // Generate deterministic but unpredictable seed
        let timestamp = clock::timestamp_ms(clock);
        let epoch = tx_context::epoch(ctx);
        let sender = tx_context::sender(ctx);

        let mut seed_data = vector::empty<u8>();
        vector::append(&mut seed_data, bcs::to_bytes(&timestamp));
        vector::append(&mut seed_data, bcs::to_bytes(&epoch));
        vector::append(&mut seed_data, bcs::to_bytes(&sender));
        vector::append(&mut seed_data, bcs::to_bytes(&player_count));

        let seed = hash::sha3_256(seed_data);
        machine.assignment_seed = seed;

        // Assign roles using Fisher-Yates shuffle with hash-based randomness
        let mut role_pool = vector::empty<u8>();

        // Fill pool with saboteur roles
        let mut i = 0;
        while (i < saboteur_count) {
            vector::push_back(&mut role_pool, ROLE_SABOTEUR);
            i = i + 1;
        };

        // Fill pool with citizen roles
        i = 0;
        while (i < citizen_count) {
            vector::push_back(&mut role_pool, ROLE_CITIZEN);
            i = i + 1;
        };

        // Shuffle role pool using seed
        shuffle_roles(&mut role_pool, &seed);

        // Assign shuffled roles to players
        i = 0;
        while (i < player_count) {
            let player = vector::borrow(players, i);
            let role = *vector::borrow(&role_pool, i);

            table::add(&mut machine.player_roles, *player, role);
            table::add(&mut machine.role_revealed, *player, false);

            i = i + 1;
        };

        machine.saboteur_count = saboteur_count;
        machine.citizen_count = citizen_count;

        event::emit(RolesAssigned {
            total_players: player_count,
            citizen_count,
            saboteur_count,
            assignment_hash: seed,
        });
    }

    /// Player reveals their own role (only they can see it)
    public fun reveal_my_role(
        machine: &mut RoleMachine,
        ctx: &TxContext
    ): u8 {
        let player = tx_context::sender(ctx);
        let role = *table::borrow(&machine.player_roles, player);

        // Mark as revealed
        if (table::contains(&machine.role_revealed, player)) {
            *table::borrow_mut(&mut machine.role_revealed, player) = true;
        };

        event::emit(RoleRevealed {
            player,
            role,
        });

        role
    }

    /// Check if consensus was reached in a vote
    public fun check_consensus(
        alive_count: u64,
        option_1_votes: u64,
        option_2_votes: u64,
        option_3_votes: u64,
        round: u64,
    ): bool {
        // Consensus threshold: 50% of alive players
        let threshold = (alive_count * CONSENSUS_THRESHOLD_PERCENT + 99) / 100; // Ceiling

        let max_votes = max_of_three(option_1_votes, option_2_votes, option_3_votes);
        let consensus_reached = max_votes >= threshold;

        event::emit(ConsensusChecked {
            round,
            max_votes,
            threshold,
            consensus_reached,
        });

        consensus_reached
    }

    /// Check win conditions based on role distribution and consensus tracking
    public fun check_win_condition(
        machine: &RoleMachine,
        survivors: &vector<address>,
        current_round: u64,
        max_rounds: u64,
        rounds_without_consensus: u64,
    ): u8 {
        let (citizen_count, saboteur_count) = count_roles_in_survivors(machine, survivors);

        // Citizens win if all saboteurs eliminated
        if (saboteur_count == 0 && citizen_count > 0) {
            event::emit(WinConditionChecked {
                citizens_alive: citizen_count,
                saboteurs_alive: saboteur_count,
                winner: ROLE_CITIZEN,
            });
            return ROLE_CITIZEN
        };

        // Saboteurs win if they control >= 50% of survivors
        if (saboteur_count > 0 && saboteur_count >= citizen_count) {
            event::emit(WinConditionChecked {
                citizens_alive: citizen_count,
                saboteurs_alive: saboteur_count,
                winner: ROLE_SABOTEUR,
            });
            return ROLE_SABOTEUR
        };

        // Saboteurs win if they prevented consensus for 2+ consecutive rounds
        // This is their primary win condition: disrupting group cohesion
        if (saboteur_count > 0 && rounds_without_consensus >= 2) {
            event::emit(WinConditionChecked {
                citizens_alive: citizen_count,
                saboteurs_alive: saboteur_count,
                winner: ROLE_SABOTEUR,
            });
            return ROLE_SABOTEUR
        };

        // Saboteurs win if max rounds reached without citizen victory
        if (current_round >= max_rounds && saboteur_count > 0) {
            event::emit(WinConditionChecked {
                citizens_alive: citizen_count,
                saboteurs_alive: saboteur_count,
                winner: ROLE_SABOTEUR,
            });
            return ROLE_SABOTEUR
        };

        // Game continues
        event::emit(WinConditionChecked {
            citizens_alive: citizen_count,
            saboteurs_alive: saboteur_count,
            winner: 0,
        });

        0 // No winner yet
    }

    /// Get role of a specific player (only after game ends)
    public fun get_player_role(machine: &RoleMachine, player: address): u8 {
        *table::borrow(&machine.player_roles, player)
    }

    /// Check if player has specific role
    public fun is_role(machine: &RoleMachine, player: address, role: u8): bool {
        *table::borrow(&machine.player_roles, player) == role
    }

    /// Get role distribution
    public fun get_role_distribution(machine: &RoleMachine): (u64, u64) {
        (machine.citizen_count, machine.saboteur_count)
    }

    /// Check if player revealed their role
    public fun has_revealed_role(machine: &RoleMachine, player: address): bool {
        *table::borrow(&machine.role_revealed, player)
    }

    // === Helper Functions ===

    /// Count roles among survivors
    fun count_roles_in_survivors(
        machine: &RoleMachine,
        survivors: &vector<address>
    ): (u64, u64) {
        let mut citizen_count = 0u64;
        let mut saboteur_count = 0u64;

        let len = vector::length(survivors);
        let mut i = 0;

        while (i < len) {
            let player = vector::borrow(survivors, i);
            let role = table::borrow(&machine.player_roles, *player);

            if (*role == ROLE_CITIZEN) {
                citizen_count = citizen_count + 1;
            } else if (*role == ROLE_SABOTEUR) {
                saboteur_count = saboteur_count + 1;
            };

            i = i + 1;
        };

        (citizen_count, saboteur_count)
    }

    /// Shuffle roles using hash-based randomness
    fun shuffle_roles(roles: &mut vector<u8>, seed: &vector<u8>) {
        let len = vector::length(roles);
        if (len <= 1) return;

        let mut i = len - 1;
        while (i > 0) {
            // Generate random index using hash
            let mut hash_input = *seed;
            vector::append(&mut hash_input, bcs::to_bytes(&i));
            let hash_output = hash::sha3_256(hash_input);

            // Use first 8 bytes as random number
            let random_value = bytes_to_u64(&hash_output);
            let j = random_value % (i + 1);

            // Swap roles[i] with roles[j]
            let temp = *vector::borrow(roles, i);
            *vector::borrow_mut(roles, i) = *vector::borrow(roles, j);
            *vector::borrow_mut(roles, j) = temp;

            i = i - 1;
        };
    }

    /// Convert first 8 bytes of vector to u64
    fun bytes_to_u64(bytes: &vector<u8>): u64 {
        let mut result = 0u64;
        let mut i = 0u64;

        while (i < 8 && i < vector::length(bytes)) {
            let byte = *vector::borrow(bytes, i);
            let shift_amount = (i * 8) as u8;
            result = result | ((byte as u64) << shift_amount);
            i = i + 1;
        };

        result
    }

    /// Find maximum of three values
    fun max_of_three(a: u64, b: u64, c: u64): u64 {
        let mut max = a;
        if (b > max) max = b;
        if (c > max) max = c;
        max
    }

    // === Constants Getters ===

    public fun role_citizen(): u8 { ROLE_CITIZEN }
    public fun role_saboteur(): u8 { ROLE_SABOTEUR }
    public fun consensus_threshold_percent(): u64 { CONSENSUS_THRESHOLD_PERCENT }
}


// items.move
module game_onchain::items {
    use one::object::{Self, UID, ID};
    use one::tx_context::{Self, TxContext};
    use one::transfer;
    use one::coin::{Self, Coin};
    use one::oct::OCT;
    use one::balance::{Self, Balance};
    use one::event;
    use one::clock::{Self, Clock};

    // === Constants ===

    // Base price for immunity token (0.1 OCT = 100_000_000 MIST)
    const BASE_IMMUNITY_PRICE: u64 = 100_000_000;

    // === Error Codes ===
    const EInsufficientPayment: u64 = 200;
    const EInvalidTier: u64 = 201;

    // === Structs ===

    /// Global item shop
    public struct ItemShop has key {
        id: UID,
        revenue: Balance<OCT>,
        base_immunity_price: u64,
        total_immunity_sold: u64,
    }

    /// Immunity Token - protects from one round elimination
    public struct ImmunityToken has key, store {
        id: UID,
        owner: address,
        purchased_at: u64,
        tier: u8,  // Tier it was purchased for
    }

    // === Events ===

    public struct ItemShopCreated has copy, drop {
        shop_id: ID,
        base_immunity_price: u64,
    }

    public struct ImmunityTokenPurchased has copy, drop {
        token_id: ID,
        buyer: address,
        tier: u8,
        price_paid: u64,
        timestamp: u64,
    }

    public struct ImmunityTokenUsed has copy, drop {
        token_id: ID,
        game_id: ID,
        player: address,
        round: u64,
    }

    // === Initialization ===

    fun init(ctx: &mut TxContext) {
        let shop = ItemShop {
            id: object::new(ctx),
            revenue: balance::zero(),
            base_immunity_price: BASE_IMMUNITY_PRICE,
            total_immunity_sold: 0,
        };

        event::emit(ItemShopCreated {
            shop_id: object::id(&shop),
            base_immunity_price: BASE_IMMUNITY_PRICE,
        });

        transfer::share_object(shop);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    // === Public Functions ===

    /// Purchase immunity token with dynamic pricing based on tier
    public entry fun buy_immunity_token(
        shop: &mut ItemShop,
        tier: u8,
        mut payment: Coin<OCT>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate tier (1-5)
        assert!(tier >= 1 && tier <= 5, EInvalidTier);

        // Calculate price: base_price * tier
        let price = shop.base_immunity_price * (tier as u64);

        // Validate payment
        assert!(coin::value(&payment) >= price, EInsufficientPayment);

        let buyer = tx_context::sender(ctx);

        // Take payment
        let payment_coin = coin::split(&mut payment, price, ctx);
        balance::join(&mut shop.revenue, coin::into_balance(payment_coin));

        // Update stats
        shop.total_immunity_sold = shop.total_immunity_sold + 1;

        // Mint immunity token
        let token = ImmunityToken {
            id: object::new(ctx),
            owner: buyer,
            purchased_at: clock::timestamp_ms(clock),
            tier,
        };

        let token_id = object::id(&token);

        event::emit(ImmunityTokenPurchased {
            token_id,
            buyer,
            tier,
            price_paid: price,
            timestamp: clock::timestamp_ms(clock),
        });

        // Transfer token to buyer
        transfer::public_transfer(token, buyer);

        // Return change
        transfer::public_transfer(payment, buyer);
    }

    /// Burn immunity token (called by game contract)
    public fun burn_immunity_token(
        token: ImmunityToken,
        game_id: ID,
        round: u64,
    ) {
        let ImmunityToken { id, owner, purchased_at: _, tier: _ } = token;

        event::emit(ImmunityTokenUsed {
            token_id: object::uid_to_inner(&id),
            game_id,
            player: owner,
            round,
        });

        object::delete(id);
    }

    // === Admin Functions ===

    /// Withdraw shop revenue (TODO: add access control)
    public entry fun withdraw_shop_revenue(
        shop: &mut ItemShop,
        ctx: &mut TxContext
    ) {
        let amount = balance::value(&shop.revenue);

        if (amount > 0) {
            let coin = coin::from_balance(
                balance::withdraw_all(&mut shop.revenue),
                ctx
            );

            transfer::public_transfer(coin, tx_context::sender(ctx));
        }
    }

    /// Update base immunity price (TODO: add access control)
    public entry fun update_immunity_price(
        shop: &mut ItemShop,
        new_price: u64,
        _ctx: &mut TxContext
    ) {
        shop.base_immunity_price = new_price;
    }

    // === View Functions ===

    public fun get_shop_info(shop: &ItemShop): (u64, u64, u64) {
        (
            shop.base_immunity_price,
            balance::value(&shop.revenue),
            shop.total_immunity_sold
        )
    }

    public fun get_immunity_token_info(token: &ImmunityToken): (address, u64, u8) {
        (token.owner, token.purchased_at, token.tier)
    }

    public fun calculate_immunity_price(shop: &ItemShop, tier: u8): u64 {
        shop.base_immunity_price * (tier as u64)
    }

    public fun get_token_owner(token: &ImmunityToken): address {
        token.owner
    }
}


// reptation.move 

module game_onchain::reputation {
    use one::object::{Self, UID, ID};
    use one::tx_context::{Self, TxContext};
    use one::transfer;
    use one::event;
    use one::table::{Self, Table};

    // === Constants ===

    // Reputation levels based on win rate
    const LEVEL_BRONZE: u8 = 1;    // 0-20% win rate
    const LEVEL_SILVER: u8 = 2;    // 20-40% win rate
    const LEVEL_GOLD: u8 = 3;      // 40-60% win rate
    const LEVEL_PLATINUM: u8 = 4;  // 60-80% win rate
    const LEVEL_DIAMOND: u8 = 5;   // 80-100% win rate

    // === Error Codes ===
    const EBadgeNotFound: u64 = 300;
    const ENotBadgeOwner: u64 = 301;

    // === Structs ===

    /// Soul-Bound Token (SBT) for player reputation
    /// Note: NO 'store' ability = non-transferable!
    public struct ReputationBadge has key {
        id: UID,
        player: address,

        // Cumulative stats
        games_played: u64,
        games_won: u64,
        total_points: u64,

        // Role-specific wins
        citizen_wins: u64,
        saboteur_wins: u64,

        // Performance metrics
        perfect_consensus_rounds: u64,  // Rounds where player voted with majority
        times_eliminated: u64,

        // Computed level (1-5)
        level: u8,

        // Tracking
        last_updated: u64,
    }

    /// Global registry to track player badges
    public struct BadgeRegistry has key {
        id: UID,
        player_badges: Table<address, ID>,  // player -> badge ID
    }

    // === Events ===

    public struct BadgeRegistryCreated has copy, drop {
        registry_id: ID,
    }

    public struct BadgeMinted has copy, drop {
        badge_id: ID,
        player: address,
        initial_level: u8,
    }

    public struct BadgeUpdated has copy, drop {
        badge_id: ID,
        player: address,
        games_played: u64,
        games_won: u64,
        new_level: u8,
        total_points: u64,
    }

    // === Initialization ===

    fun init(ctx: &mut TxContext) {
        let registry = BadgeRegistry {
            id: object::new(ctx),
            player_badges: table::new(ctx),
        };

        event::emit(BadgeRegistryCreated {
            registry_id: object::id(&registry),
        });

        transfer::share_object(registry);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    // === Public Functions ===

    /// Mint new reputation badge for a player
    public fun mint_badge(
        registry: &mut BadgeRegistry,
        player: address,
        initial_points: u64,
        won: bool,
        role_was_citizen: bool,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let games_won = if (won) 1 else 0;
        let initial_level = calculate_level(games_won, 1);

        let badge = ReputationBadge {
            id: object::new(ctx),
            player,
            games_played: 1,
            games_won,
            total_points: initial_points,
            citizen_wins: if (won && role_was_citizen) 1 else 0,
            saboteur_wins: if (won && !role_was_citizen) 1 else 0,
            perfect_consensus_rounds: 0,
            times_eliminated: if (won) 0 else 1,
            level: initial_level,
            last_updated: timestamp,
        };

        let badge_id = object::id(&badge);

        event::emit(BadgeMinted {
            badge_id,
            player,
            initial_level,
        });

        // Register in global registry
        table::add(&mut registry.player_badges, player, badge_id);

        // Transfer badge to player (soul-bound - can't transfer further)
        transfer::transfer(badge, player);
    }

    /// Update existing badge with new game results
    public fun update_badge(
        badge: &mut ReputationBadge,
        points_earned: u64,
        won: bool,
        role_was_citizen: bool,
        timestamp: u64,
    ) {
        // Update games played
        badge.games_played = badge.games_played + 1;

        // Update win stats
        if (won) {
            badge.games_won = badge.games_won + 1;

            if (role_was_citizen) {
                badge.citizen_wins = badge.citizen_wins + 1;
            } else {
                badge.saboteur_wins = badge.saboteur_wins + 1;
            }
        } else {
            badge.times_eliminated = badge.times_eliminated + 1;
        };

        // Update points
        badge.total_points = badge.total_points + points_earned;

        // Recalculate level based on win rate
        badge.level = calculate_level(badge.games_won, badge.games_played);

        badge.last_updated = timestamp;

        event::emit(BadgeUpdated {
            badge_id: object::uid_to_inner(&badge.id),
            player: badge.player,
            games_played: badge.games_played,
            games_won: badge.games_won,
            new_level: badge.level,
            total_points: badge.total_points,
        });
    }

    /// Check if player has a badge registered
    public fun has_badge(registry: &BadgeRegistry, player: address): bool {
        table::contains(&registry.player_badges, player)
    }

    /// Get badge ID for a player
    public fun get_badge_id(registry: &BadgeRegistry, player: address): ID {
        assert!(table::contains(&registry.player_badges, player), EBadgeNotFound);
        *table::borrow(&registry.player_badges, player)
    }

    // === Helper Functions ===

    /// Calculate reputation level based on win rate
    fun calculate_level(wins: u64, games: u64): u8 {
        if (games == 0) return LEVEL_BRONZE;

        let win_rate = (wins * 100) / games;  // Percentage

        if (win_rate >= 80) {
            LEVEL_DIAMOND
        } else if (win_rate >= 60) {
            LEVEL_PLATINUM
        } else if (win_rate >= 40) {
            LEVEL_GOLD
        } else if (win_rate >= 20) {
            LEVEL_SILVER
        } else {
            LEVEL_BRONZE
        }
    }

    // === View Functions ===

    public fun get_badge_stats(badge: &ReputationBadge): (u64, u64, u64, u8) {
        (
            badge.games_played,
            badge.games_won,
            badge.total_points,
            badge.level
        )
    }

    public fun get_role_wins(badge: &ReputationBadge): (u64, u64) {
        (badge.citizen_wins, badge.saboteur_wins)
    }

    public fun get_badge_level(badge: &ReputationBadge): u8 {
        badge.level
    }

    public fun get_win_rate(badge: &ReputationBadge): u64 {
        if (badge.games_played == 0) return 0;
        (badge.games_won * 100) / badge.games_played
    }

    public fun get_player_address(badge: &ReputationBadge): address {
        badge.player
    }

    // === Constants Getters ===

    public fun level_bronze(): u8 { LEVEL_BRONZE }
    public fun level_silver(): u8 { LEVEL_SILVER }
    public fun level_gold(): u8 { LEVEL_GOLD }
    public fun level_platinum(): u8 { LEVEL_PLATINUM }
    public fun level_diamond(): u8 { LEVEL_DIAMOND }
}

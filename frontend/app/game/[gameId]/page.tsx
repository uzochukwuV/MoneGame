'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useGameState } from '@/hooks/useGameState';
import { useGameActionsWithSponsor } from '@/hooks/useGameActionsWithSponsor';
import { TIER_NAMES, GameStatus, QUESTION_TIME_MS, ANSWER_TIME_MS } from '@/lib/constants';
import Link from 'next/link';

type GamePhase = 'question' | 'answer' | 'finalization' | 'finished';

export default function ActiveGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const currentAccount = useCurrentAccount();

  const { gameState, loading, error, isPlayerInGame } = useGameState(gameId);
  const { askQuestion, submitAnswer, revealRole, useImmunity, finalizeRound, claimPrize } = useGameActionsWithSponsor();

  // UI State
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [questionerAnswer, setQuestionerAnswer] = useState<1 | 2 | 3>(1);
  const [playerAnswer, setPlayerAnswer] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [playerRole, setPlayerRole] = useState<'citizen' | 'saboteur' | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Redirect if game is waiting (should be in lobby)
  useEffect(() => {
    if (gameState?.status === GameStatus.WAITING) {
      router.push(`/game/${gameId}/lobby`);
    }
  }, [gameState?.status, gameId, router]);

  // Calculate time remaining
  useEffect(() => {
    if (!gameState) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = gameState.questionDeadline || gameState.answerDeadline || 0;
      const remaining = Math.max(0, deadline - now);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  // Determine current phase
  const getCurrentPhase = (): GamePhase => {
    if (!gameState) return 'finished';
    if (gameState.status === GameStatus.FINISHED) return 'finished';

    const now = Date.now();
    const questionAsked = !!gameState.currentQuestion;

    if (!questionAsked) {
      return 'question';
    } else if (gameState.answerDeadline && now <= gameState.answerDeadline) {
      return 'answer';
    } else {
      return 'finalization';
    }
  };

  const currentPhase = getCurrentPhase();

  // Check if current user is questioner
  const isQuestioner = currentAccount?.address === gameState?.current_questioner;

  // Check if current user is eliminated
  const isEliminated = gameState?.players.find(p => p.address === currentAccount?.address)?.isAlive === false;

  // Handle reveal role
  const handleRevealRole = async () => {
    if (!gameState) return;

    try {
      setRevealing(true);
      const role = await revealRole(gameId);
      setPlayerRole(role);
      alert(`Your role is: ${role === 'citizen' ? 'CITIZEN 👥' : 'SABOTEUR 🎭'}`);
    } catch (error) {
      console.error('Error revealing role:', error);
      alert('Failed to reveal role: ' + (error as Error).message);
    } finally {
      setRevealing(false);
    }
  };

  // Handle ask question
  const handleAskQuestion = async () => {
    if (!question || !optionA || !optionB || !optionC) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      await askQuestion(gameId, question, optionA, optionB, optionC, questionerAnswer);

      // Clear form
      setQuestion('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setHasAnswered(true);
    } catch (error) {
      console.error('Error asking question:', error);
      alert('Failed to ask question: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle submit answer
  const handleSubmitAnswer = async () => {
    try {
      setSubmitting(true);
      await submitAnswer(gameId, playerAnswer);
      setHasAnswered(true);
      alert('Answer submitted successfully!');
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle finalize round
  const handleFinalizeRound = async () => {
    try {
      setFinalizing(true);
      await finalizeRound(gameId);
      setHasAnswered(false); // Reset for next round
      alert('Round finalized! Check the results.');
    } catch (error) {
      console.error('Error finalizing round:', error);
      alert('Failed to finalize round: ' + (error as Error).message);
    } finally {
      setFinalizing(false);
    }
  };

  // Handle claim prize
  const handleClaimPrize = async () => {
    try {
      setClaiming(true);
      await claimPrize(gameId);
      alert('Prize claimed successfully!');
    } catch (error) {
      console.error('Error claiming prize:', error);
      alert('Failed to claim prize: ' + (error as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  // Format time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ color: '#9ca3af' }}>Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Game Not Found</h2>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>{error || 'Could not load game'}</p>
          <Link
            href="/discover/1"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const alivePlayers = gameState.players.filter(p => p.isAlive);
  const prizePoolOCT = (parseInt(gameState.prizePool) / 1_000_000_000).toFixed(2);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
            {TIER_NAMES[gameState.tier as keyof typeof TIER_NAMES]} Game
          </h1>
          <Link
            href={`/discover/${gameState.tier}`}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontSize: '0.875rem'
            }}
          >
            ← Leave
          </Link>
        </div>

        {/* Game Stats Bar */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              Round
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
              {gameState.currentRound} / {gameState.maxRounds}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              Survivors
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
              {alivePlayers.length} / {gameState.players.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              Prize Pool
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
              {prizePoolOCT} OCT
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              Time Left
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: timeRemaining < 30000 ? '#ef4444' : 'white' }}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Role & Actions Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleRevealRole}
          disabled={revealing || !!playerRole}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: playerRole ? (playerRole === 'citizen' ? '#3b82f6' : '#ef4444') : 'rgba(139, 92, 246, 0.2)',
            color: 'white',
            fontWeight: '600',
            borderRadius: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            cursor: revealing || playerRole ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {playerRole ? `Your Role: ${playerRole === 'citizen' ? '👥 CITIZEN' : '🎭 SABOTEUR'}` : revealing ? 'Revealing...' : '🔍 Reveal My Role'}
        </button>

        <button
          onClick={() => alert('Use Immunity Token feature coming soon!')}
          disabled={isEliminated}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            color: '#fbbf24',
            fontWeight: '600',
            borderRadius: '0.5rem',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            cursor: isEliminated ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          🛡️ Use Immunity Token
        </button>
      </div>

      {/* Eliminated Banner */}
      {isEliminated && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💀</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '0.5rem' }}>
            You have been eliminated!
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            You can still watch the game but cannot participate in voting.
          </p>
        </div>
      )}

      {/* PHASE: Question Phase */}
      {currentPhase === 'question' && !isEliminated && (
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❓</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              Question Phase
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              {isQuestioner
                ? "You are the questioner! Ask a question with 3 options."
                : `Waiting for questioner to ask a question... (${gameState.players.find(p => p.address === gameState.current_questioner)?.address.slice(0, 6)}...)`}
            </p>
          </div>

          {isQuestioner && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                  Your Question (max 50 chars)
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 50))}
                  maxLength={50}
                  placeholder="What is your favorite color?"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {question.length}/50
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                    Option A
                  </label>
                  <input
                    type="text"
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value.slice(0, 50))}
                    maxLength={50}
                    placeholder="Red"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                    Option B
                  </label>
                  <input
                    type="text"
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value.slice(0, 50))}
                    maxLength={50}
                    placeholder="Blue"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                    Option C
                  </label>
                  <input
                    type="text"
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value.slice(0, 50))}
                    maxLength={50}
                    placeholder="Green"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                  Your Answer (choose one)
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[1, 2, 3].map((option) => (
                    <button
                      key={option}
                      onClick={() => setQuestionerAnswer(option as 1 | 2 | 3)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: questionerAnswer === option ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${questionerAnswer === option ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '0.5rem',
                        color: 'white',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Option {String.fromCharCode(64 + option)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAskQuestion}
                disabled={submitting || !question || !optionA || !optionB || !optionC}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: submitting ? '#6b7280' : '#3b82f6',
                  color: 'white',
                  fontWeight: 'bold',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: submitting || !question || !optionA || !optionB || !optionC ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                {submitting ? 'Submitting Question...' : 'Ask Question & Submit Answer'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE: Answer Phase */}
      {currentPhase === 'answer' && !isEliminated && gameState.currentQuestion && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗳️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              Answer Phase
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Vote with the majority to survive! Minority votes are eliminated.
            </p>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Question Display */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                "{gameState.currentQuestion}"
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Asked by {gameState.players.find(p => p.address === gameState.current_questioner)?.address.slice(0, 6)}...
              </div>
            </div>

            {/* Answer Options */}
            {!hasAnswered ? (
              <>
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    { value: 1, label: 'A', text: optionA },
                    { value: 2, label: 'B', text: optionB },
                    { value: 3, label: 'C', text: optionC },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPlayerAnswer(option.value as 1 | 2 | 3)}
                      style={{
                        padding: '1.5rem',
                        backgroundColor: playerAnswer === option.value ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${playerAnswer === option.value ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '0.75rem',
                        color: 'white',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '3rem',
                          height: '3rem',
                          borderRadius: '50%',
                          backgroundColor: playerAnswer === option.value ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {option.label}
                        </div>
                        <div style={{ fontSize: '1.125rem' }}>{option.text}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: submitting ? '#6b7280' : '#10b981',
                    color: 'black',
                    fontWeight: 'bold',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {submitting ? 'Submitting Answer...' : 'Submit Answer'}
                </button>
              </>
            ) : (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '0.75rem',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                  Answer Submitted!
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                  Waiting for other players to vote...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE: Finalization */}
      {currentPhase === 'finalization' && !isEliminated && (
        <div style={{
          backgroundColor: 'rgba(251, 191, 36, 0.05)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏱️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            Time's Up!
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2rem' }}>
            The round has ended. Anyone can finalize to see the results and move to the next round.
          </p>
          <button
            onClick={handleFinalizeRound}
            disabled={finalizing}
            style={{
              padding: '1rem 2rem',
              backgroundColor: finalizing ? '#6b7280' : '#fbbf24',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: finalizing ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {finalizing ? 'Finalizing Round...' : 'Finalize Round & See Results'}
          </button>
        </div>
      )}

      {/* PHASE: Game Finished */}
      {currentPhase === 'finished' && (
        <div style={{
          backgroundColor: 'rgba(139, 92, 246, 0.05)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '0.75rem',
          padding: '3rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
            Game Over!
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '2rem' }}>
            The game has ended. Check if you won and claim your prize!
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleClaimPrize}
              disabled={claiming}
              style={{
                padding: '1rem 2rem',
                backgroundColor: claiming ? '#6b7280' : '#8b5cf6',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: claiming ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              {claiming ? 'Claiming...' : 'Claim Prize'}
            </button>
            <Link
              href={`/discover/${gameState.tier}`}
              style={{
                padding: '1rem 2rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                display: 'inline-block',
                fontSize: '1rem'
              }}
            >
              Play Again
            </Link>
          </div>
        </div>
      )}

      {/* Players List */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
          Players ({alivePlayers.length} alive)
        </h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {gameState.players.map((player, index) => (
            <div
              key={player.address}
              style={{
                backgroundColor: player.isAlive ? 'rgba(255, 255, 255, 0.03)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${player.isAlive ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                opacity: player.isAlive ? 1 : 0.5
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>
                {player.isAlive ? '👤' : '💀'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'white' }}>
                  {player.address.slice(0, 6)}...{player.address.slice(-4)}
                </div>
              </div>
              {player.address === currentAccount?.address && (
                <div style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  You
                </div>
              )}
              {player.address === gameState.current_questioner && currentPhase === 'question' && (
                <div style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  Questioner
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

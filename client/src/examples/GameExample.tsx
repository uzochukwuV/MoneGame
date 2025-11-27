import { useState } from 'react';
import { useGameActions } from '../hooks/useGameActions';
import { GAME_PACKAGE_ID, TIER_ENTRY_FEES } from '../config/game';

export function GameExample() {
  const { createGame, joinGame, askQuestion, submitAnswer, claimPrize, isLoading, error } = 
    useGameActions({ packageId: GAME_PACKAGE_ID });
  
  const [gameId, setGameId] = useState('');

  const handleCreateGame = async () => {
    try {
      const digest = await createGame(1); // Tier 1
      console.log('Game created:', digest);
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  };

  const handleJoinGame = async () => {
    if (!gameId) {
      alert('Please enter a game ID');
      return;
    }

    try {
      const digest = await joinGame(gameId, 1, TIER_ENTRY_FEES[1]);
      console.log('Joined game:', digest);
    } catch (err) {
      console.error('Failed to join game:', err);
    }
  };

  const handleAskQuestion = async () => {
    if (!gameId) {
      alert('Please enter a game ID');
      return;
    }

    try {
      const digest = await askQuestion(
        gameId,
        'What is the capital of France?',
        'Paris',
        'London',
        'Berlin',
        1 // My answer is option 1 (Paris)
      );
      console.log('Question asked:', digest);
    } catch (err) {
      console.error('Failed to ask question:', err);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!gameId) {
      alert('Please enter a game ID');
      return;
    }

    try {
      const digest = await submitAnswer(gameId, 1); // Choose option 1
      console.log('Answer submitted:', digest);
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  const handleClaimPrize = async () => {
    if (!gameId) {
      alert('Please enter a game ID');
      return;
    }

    try {
      const digest = await claimPrize(gameId);
      console.log('Prize claimed:', digest);
    } catch (err) {
      console.error('Failed to claim prize:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Game Actions Example</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '0.5rem', width: '300px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={handleCreateGame} disabled={isLoading}>
          Create Game
        </button>
        <button onClick={handleJoinGame} disabled={isLoading}>
          Join Game
        </button>
        <button onClick={handleAskQuestion} disabled={isLoading}>
          Ask Question
        </button>
        <button onClick={handleSubmitAnswer} disabled={isLoading}>
          Submit Answer
        </button>
        <button onClick={handleClaimPrize} disabled={isLoading}>
          Claim Prize
        </button>
      </div>

      {isLoading && <p>Loading...</p>}
    </div>
  );
}

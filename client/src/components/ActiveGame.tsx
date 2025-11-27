import { useState } from 'react';
import type { GameInfo, Question, VotingStats } from '../types/game';
import { Tier, TIER_NAMES, GameStatus } from '../types/game';

interface ActiveGameProps {
  gameInfo: GameInfo;
  question: Question | null;
  isQuestioner: boolean;
  hasAnswered: boolean;
  playerAnswer: number | null;
  timeRemaining: number;
  answerCount: number;
  votingStats: VotingStats | null;
  onAskQuestion: (question: Question, answer: 1 | 2 | 3) => void;
  onSubmitAnswer: (choice: 1 | 2 | 3) => void;
  onLeave: () => void;
}

export function ActiveGame({
  gameInfo,
  question,
  isQuestioner,
  hasAnswered,
  playerAnswer,
  timeRemaining,
  answerCount,
  votingStats,
  onAskQuestion,
  onSubmitAnswer,
  onLeave
}: ActiveGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<1 | 2 | 3 | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    myAnswer: null as 1 | 2 | 3 | null
  });

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitQuestion = () => {
    if (questionForm.question && questionForm.optionA && questionForm.optionB && questionForm.optionC && questionForm.myAnswer) {
      onAskQuestion({
        question: questionForm.question,
        optionA: questionForm.optionA,
        optionB: questionForm.optionB,
        optionC: questionForm.optionC
      }, questionForm.myAnswer);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer) {
      onSubmitAnswer(selectedAnswer);
    }
  };

  const getMajorityAnswer = () => {
    if (!votingStats) return null;
    const { votesA, votesB, votesC } = votingStats;
    if (votesA >= votesB && votesA >= votesC) return 1;
    if (votesB >= votesA && votesB >= votesC) return 2;
    return 3;
  };

  const getOptionClass = (optionNum: 1 | 2 | 3) => {
    let classes = 'option-button';
    
    if (hasAnswered && playerAnswer === optionNum) {
      classes += ' selected';
    } else if (selectedAnswer === optionNum) {
      classes += ' selected';
    }
    
    if (votingStats) {
      const majority = getMajorityAnswer();
      if (optionNum === majority) {
        classes += ' correct';
      } else if (playerAnswer === optionNum && optionNum !== majority) {
        classes += ' wrong';
      }
    }
    
    return classes;
  };

  return (
    <div className="game-container">
      <div className="game-card">
        <div className="game-header">
          <div className="game-info">
            <h2>{TIER_NAMES[gameInfo.tier as Tier]} Battle</h2>
            <div className="game-meta">
              <span>{gameInfo.playerCount - gameInfo.eliminatedCount} players remaining</span>
              <span>{gameInfo.eliminatedCount} eliminated</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="round-badge">Round {gameInfo.currentRound}/3</span>
            <div className="timer">
              <span className="timer-display">{formatTime(timeRemaining)}</span>
            </div>
          </div>
        </div>

        {!question && isQuestioner && gameInfo.status === GameStatus.ACTIVE ? (
          <div className="question-section">
            <div className="questioner-badge">
              &#x2728; You are the Questioner!
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Create a question with 3 options. Other players will vote, and the majority wins!
            </p>
            
            <div className="question-form">
              <div className="form-group">
                <label className="form-label">Your Question</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What is the best programming language?"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Option A</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="JavaScript"
                  value={questionForm.optionA}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, optionA: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Option B</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Python"
                  value={questionForm.optionB}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, optionB: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Option C</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rust"
                  value={questionForm.optionC}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, optionC: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Answer (you must vote too!)</label>
                <div className="answer-selector">
                  {(['A', 'B', 'C'] as const).map((letter, idx) => (
                    <button
                      key={letter}
                      className={`answer-option ${questionForm.myAnswer === idx + 1 ? 'selected' : ''}`}
                      onClick={() => setQuestionForm(prev => ({ ...prev, myAnswer: (idx + 1) as 1 | 2 | 3 }))}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className="submit-button" 
                style={{ width: '100%' }}
                onClick={handleSubmitQuestion}
                disabled={!questionForm.question || !questionForm.optionA || !questionForm.optionB || !questionForm.optionC || !questionForm.myAnswer}
              >
                Submit Question
              </button>
            </div>
          </div>
        ) : !question && gameInfo.status === GameStatus.ACTIVE ? (
          <div className="question-section pending-question-dialog">
            <div className="pending-dialog-content">
              <div className="pending-icon">⏳</div>
              <h3 className="pending-title">Waiting for Question</h3>
              <p className="pending-questioner">
                Questioner: <span className="questioner-address">{gameInfo.currentQuestioner?.slice(0, 12)}...</span>
              </p>
              <p className="pending-description">
                The questioner is preparing a question for this round. Stay tuned!
              </p>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p className="pending-subtitle">
                Round {gameInfo.currentRound} • {gameInfo.playerCount - gameInfo.eliminatedCount} players remaining
              </p>
            </div>
          </div>
        ) : question ? (
          <div className="question-section">
            <h3 className="question-text">{question.question}</h3>

            <div className="options-grid">
              {[
                { letter: 'A', text: question.optionA, value: 1 as const },
                { letter: 'B', text: question.optionB, value: 2 as const },
                { letter: 'C', text: question.optionC, value: 3 as const }
              ].map((option) => (
                <button
                  key={option.letter}
                  className={getOptionClass(option.value)}
                  onClick={() => !hasAnswered && setSelectedAnswer(option.value)}
                  disabled={hasAnswered}
                >
                  <span className="option-letter">{option.letter}</span>
                  <span className="option-text">{option.text}</span>
                  {votingStats && (
                    <span className="vote-count">
                      {option.value === 1 ? votingStats.votesA : option.value === 2 ? votingStats.votesB : votingStats.votesC} votes
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!hasAnswered && (
              <button 
                className="submit-button" 
                style={{ marginTop: '2rem' }}
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
              >
                Lock In Answer
              </button>
            )}

            {hasAnswered && !votingStats && (
              <p style={{ color: 'var(--success)', marginTop: '1.5rem' }}>
                &#x2714; Answer submitted! Waiting for other players...
              </p>
            )}
          </div>
        ) : (
          <div className="question-section">
            <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem' }}>
              Game is loading...
            </p>
          </div>
        )}

        <div className="players-bar">
          <div className="players-info">
            <span className="players-count">{answerCount} / {gameInfo.playerCount - gameInfo.eliminatedCount}</span>
            <span style={{ color: 'var(--text-muted)' }}>players answered</span>
          </div>
          <button className="back-button" onClick={onLeave}>
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}

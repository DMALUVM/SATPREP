import React, { useEffect, useMemo, useState } from 'react';
import { completeSession, submitAttempt } from '../lib/apiClient';
import { estimateSessionWindow } from '../lib/sessionTime';

function normalizeGridAnswer(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function hasAnswerKey(question) {
  return typeof question?.answer_key !== 'undefined' && question?.answer_key !== null;
}

function isAnswerCorrect(question, answer) {
  if (!hasAnswerKey(question)) return false;
  if (question.format === 'multiple_choice') {
    return Number(answer) === Number(question.answer_key);
  }
  return normalizeGridAnswer(answer) === normalizeGridAnswer(question.answer_key);
}

function formatTimer(seconds) {
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export default function SessionRunner({
  title,
  mode,
  questions,
  planDate,
  timeLimitSeconds = 0,
  plannedTimeLabel = '',
  persistApi = true,
  missionUpdate = null,
  onFinish,
  onExit,
  coachTone = 'firm-supportive',
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [currentInput, setCurrentInput] = useState('');
  const [sessionStart] = useState(() => Date.now());
  const [questionStart, setQuestionStart] = useState(() => Date.now());
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [warning, setWarning] = useState('');

  const currentQuestion = questions[index] || null;

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  useEffect(() => {
    if (!timeLimitSeconds) return undefined;
    if (secondsElapsed >= timeLimitSeconds) {
      finalizeSession();
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsElapsed, timeLimitSeconds]);

  const remainingSeconds = useMemo(() => {
    if (!timeLimitSeconds) return null;
    return Math.max(0, timeLimitSeconds - secondsElapsed);
  }, [timeLimitSeconds, secondsElapsed]);

  const score = useMemo(() => {
    const entries = Object.values(submitted);
    const total = entries.length;
    const correct = entries.filter((item) => item.isCorrect).length;
    return { total, correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
  }, [submitted]);

  const estimatedTimeLabel = useMemo(() => {
    if (plannedTimeLabel) return plannedTimeLabel;
    return estimateSessionWindow({ questions, timeLimitSeconds }).label;
  }, [plannedTimeLabel, questions, timeLimitSeconds]);

  async function submitCurrentAnswer() {
    if (!currentQuestion || sessionBusy) return;

    const rawAnswer = currentQuestion.format === 'multiple_choice' ? currentInput : normalizeGridAnswer(currentInput);
    if (rawAnswer === '' || rawAnswer === null || rawAnswer === undefined) return;

    setWarning('');

    let resolvedCorrect = isAnswerCorrect(currentQuestion, rawAnswer);
    const secondsSpent = Math.max(1, Math.floor((Date.now() - questionStart) / 1000));

    if (persistApi) {
      setSessionBusy(true);
      try {
        const response = await submitAttempt({
          question_id: currentQuestion.id,
          session_mode: mode,
          seconds_spent: secondsSpent,
          response_payload: { answer: rawAnswer },
        });

        if (typeof response?.attempt?.is_correct === 'boolean') {
          resolvedCorrect = response.attempt.is_correct;
        }
      } catch (error) {
        if (!hasAnswerKey(currentQuestion)) {
          setWarning('Temporary network issue. Retry submit so this answer can be graded correctly.');
          setSessionBusy(false);
          return;
        }
        // Keep local progress if network call fails and local key exists.
        // eslint-disable-next-line no-console
        console.warn('submitAttempt failed:', error.message);
        setWarning('Network issue: saved locally for now.');
      } finally {
        setSessionBusy(false);
      }
    }

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: rawAnswer }));
    setSubmitted((prev) => ({
      ...prev,
      [currentQuestion.id]: { isCorrect: resolvedCorrect, secondsSpent, answer: rawAnswer },
    }));
  }

  async function nextQuestion() {
    if (!currentQuestion) return;
    if (!submitted[currentQuestion.id]) return;

    const next = index + 1;
    if (next >= questions.length) {
      await finalizeSession();
      return;
    }
    const nextQuestionObj = questions[next];
    setIndex(next);
    setCurrentInput(answers[nextQuestionObj.id] || '');
    setQuestionStart(Date.now());
  }

  async function finalizeSession() {
    if (sessionBusy) return;
    setSessionBusy(persistApi);

    const submittedEntries = Object.entries(submitted);
    const attemptedCount = submittedEntries.length;
    const totalCount = questions.length;
    const correctCount = submittedEntries.filter(([, value]) => value.isCorrect).length;
    const avgSeconds = submittedEntries.length
      ? submittedEntries.reduce((sum, [, value]) => sum + value.secondsSpent, 0) / submittedEntries.length
      : 0;
    const skillBreakdown = {};
    const domainBreakdown = {};

    submittedEntries.forEach(([questionId, value]) => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      if (!skillBreakdown[question.skill]) {
        skillBreakdown[question.skill] = { attempts: 0, correct: 0, seconds: 0 };
      }
      if (!domainBreakdown[question.domain]) {
        domainBreakdown[question.domain] = { attempts: 0, correct: 0, seconds: 0 };
      }

      skillBreakdown[question.skill].attempts += 1;
      skillBreakdown[question.skill].seconds += value.secondsSpent;
      if (value.isCorrect) skillBreakdown[question.skill].correct += 1;

      domainBreakdown[question.domain].attempts += 1;
      domainBreakdown[question.domain].seconds += value.secondsSpent;
      if (value.isCorrect) domainBreakdown[question.domain].correct += 1;
    });

    if (persistApi) {
      const completionPayload = {
        mode,
        started_at: new Date(sessionStart).toISOString(),
        completed_at: new Date().toISOString(),
        question_ids: questions.map((q) => q.id),
        correct_count: correctCount,
        total_count: totalCount,
        avg_seconds: Number(avgSeconds.toFixed(2)),
      };

      if (missionUpdate?.enabled && planDate) {
        completionPayload.plan_date = planDate;
        completionPayload.mission_status = missionUpdate.status || 'complete';
        completionPayload.tasks = missionUpdate.tasks || [];
        completionPayload.target_minutes = Number(missionUpdate.target_minutes || 55);
        completionPayload.completion_summary = {
          completed_tasks: Number(missionUpdate.completed_tasks || 1),
          attempted_count: attemptedCount,
          accuracy: totalCount ? Math.round((correctCount / totalCount) * 100) : 0,
          pace_seconds: Number(avgSeconds.toFixed(1)),
        };
      }

      try {
        await completeSession(completionPayload);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('completeSession failed:', error.message);
      }
    }

    setSessionBusy(false);

    onFinish?.({
      totalCount,
      attemptedCount,
      correctCount,
      accuracyPct: totalCount ? Math.round((correctCount / totalCount) * 100) : 0,
      avgSeconds: Number(avgSeconds.toFixed(1)),
      elapsedSeconds: secondsElapsed,
      mode,
      skillBreakdown,
      domainBreakdown,
    });
  }

  useEffect(() => {
    if (!currentQuestion) return;
    setCurrentInput(answers[currentQuestion.id] ?? '');
  }, [currentQuestion, answers]);

  if (!currentQuestion) {
    return (
      <div className="sat-panel">
        <h2>{title}</h2>
        <p>No questions loaded for this session.</p>
        <button className="sat-btn" onClick={onExit} type="button">
          Back
        </button>
      </div>
    );
  }

  const review = submitted[currentQuestion.id];

  return (
    <section className="sat-session">
      <header className="sat-session__header">
        <h2>{title}</h2>
        <div className="sat-session__meta">
          <span>
            Q {index + 1} / {questions.length}
          </span>
          <span>Score {score.correct}/{score.total}</span>
          <span>Plan {estimatedTimeLabel}</span>
          <span className={timeLimitSeconds && remainingSeconds < 180 ? 'is-danger' : ''}>
            {timeLimitSeconds ? `Time ${formatTimer(remainingSeconds)}` : `Elapsed ${formatTimer(secondsElapsed)}`}
          </span>
        </div>
      </header>

      <article className="sat-question-card">
        <div className="sat-question-card__tags">
          <span>{currentQuestion.domain}</span>
          <span>{currentQuestion.skill}</span>
          <span>Difficulty {currentQuestion.difficulty}</span>
        </div>
        <h3 className="sat-question-card__stem">{currentQuestion.stem}</h3>

        {currentQuestion.format === 'multiple_choice' ? (
          <div className="sat-choice-list">
            {currentQuestion.choices.map((choice, choiceIndex) => {
              const checked = String(currentInput) === String(choiceIndex);
              return (
                <button
                  key={`${currentQuestion.id}-choice-${choiceIndex}`}
                  className={`sat-choice ${checked ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => setCurrentInput(String(choiceIndex))}
                  disabled={!!review}
                >
                  <span className="sat-choice__letter">{String.fromCharCode(65 + choiceIndex)}</span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <label className="sat-grid-input">
            <span>Enter answer</span>
            <input
              value={currentInput}
              onChange={(event) => setCurrentInput(event.target.value)}
              disabled={!!review}
              placeholder="Type your answer"
            />
          </label>
        )}

        <div className="sat-session__actions">
          {!review ? (
            <button className="sat-btn sat-btn--primary" onClick={submitCurrentAnswer} type="button" disabled={sessionBusy}>
              Submit Answer
            </button>
          ) : (
            <button className="sat-btn sat-btn--primary" onClick={nextQuestion} type="button" disabled={sessionBusy}>
              {index + 1 >= questions.length ? 'Finish Session' : 'Next Question'}
            </button>
          )}
          <button className="sat-btn sat-btn--ghost" onClick={finalizeSession} type="button" disabled={sessionBusy}>
            End Session
          </button>
        </div>

        {warning ? <div className="sat-alert">{warning}</div> : null}

        {review ? (
          <div className={`sat-feedback ${review.isCorrect ? 'is-correct' : 'is-incorrect'}`}>
            <h4>{review.isCorrect ? 'Correct' : 'Not Quite'}</h4>
            <p>
              {coachTone === 'firm-supportive'
                ? review.isCorrect
                  ? 'Keep pressure high. This needs to be repeatable under timer stress.'
                  : 'Fix the process immediately and re-run this type tomorrow at speed.'
                : review.isCorrect
                  ? 'Nice work.'
                  : 'Review the explanation and try again.'}
            </p>
            <ol>
              {currentQuestion.explanation_steps.map((step) => (
                <li key={`${currentQuestion.id}-${step.slice(0, 14)}`}>{step}</li>
              ))}
            </ol>
            <p>
              <strong>Strategy:</strong> {currentQuestion.strategy_tip}
            </p>
            <p>
              <strong>Common trap:</strong> {currentQuestion.trap_tag}
            </p>
          </div>
        ) : null}
      </article>
    </section>
  );
}

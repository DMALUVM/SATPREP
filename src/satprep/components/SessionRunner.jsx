import React, { useEffect, useMemo, useState } from 'react';
import { completeSession, submitAttempt } from '../lib/apiClient';
import { buildCoachingPlan } from '../lib/coaching';
import { getDesmosGuide } from '../lib/desmosGuide';
import { estimateSessionWindow } from '../lib/sessionTime';
import { toStudentFriendlyMathList, toStudentFriendlyMathText } from '../lib/textFormat';

function normalizeGridAnswer(value) {
  return String(value || '').trim().replace(/\s+/g, '');
}

function hasAnswerKey(question) {
  return typeof question?.answer_key !== 'undefined' && question?.answer_key !== null;
}

function isAnswerCorrect(question, answer) {
  if (!hasAnswerKey(question)) return null;
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

function renderCoachTone(coachTone, review) {
  if (!review) return '';
  if (coachTone !== 'firm-supportive') {
    return review.isCorrect ? 'Nice work. Keep this method.' : 'Review the diagnosis and retry this type now.';
  }
  if (review.isCorrect) {
    return 'Strong rep. Keep pressure high so this stays repeatable under timer stress.';
  }
  return 'Correct the process now. Do not carry this error pattern into the next set.';
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
  const [socraticMode, setSocraticMode] = useState(true);
  const [socraticStepByQuestion, setSocraticStepByQuestion] = useState({});
  const [solutionRevealedByQuestion, setSolutionRevealedByQuestion] = useState({});

  const currentQuestion = questions[index] || null;
  const review = currentQuestion ? submitted[currentQuestion.id] : null;

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
    const graded = entries.filter((item) => typeof item.isCorrect === 'boolean');
    const total = graded.length;
    const correct = graded.filter((item) => item.isCorrect).length;
    const pending = entries.length - graded.length;
    return {
      total,
      correct,
      pending,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    };
  }, [submitted]);

  const estimatedTimeLabel = useMemo(() => {
    if (plannedTimeLabel) return plannedTimeLabel;
    return estimateSessionWindow({ questions, timeLimitSeconds }).label;
  }, [plannedTimeLabel, questions, timeLimitSeconds]);

  const displayStem = useMemo(
    () => toStudentFriendlyMathText(currentQuestion?.stem || ''),
    [currentQuestion]
  );

  const displayChoices = useMemo(
    () => toStudentFriendlyMathList(currentQuestion?.choices || []),
    [currentQuestion]
  );

  const displaySteps = useMemo(
    () => toStudentFriendlyMathList(currentQuestion?.explanation_steps || []),
    [currentQuestion]
  );

  const displayStrategy = useMemo(
    () => toStudentFriendlyMathText(currentQuestion?.strategy_tip || ''),
    [currentQuestion]
  );

  const displayTrap = useMemo(
    () => toStudentFriendlyMathText(currentQuestion?.trap_tag || ''),
    [currentQuestion]
  );

  const desmosGuide = useMemo(
    () => getDesmosGuide(currentQuestion),
    [currentQuestion]
  );

  const coachingPlan = useMemo(
    () => buildCoachingPlan(currentQuestion, review, mode),
    [currentQuestion, review, mode]
  );

  const socraticPrompts = coachingPlan?.socraticPrompts || [];
  const socraticIndex = currentQuestion ? Number(socraticStepByQuestion[currentQuestion.id] || 0) : 0;
  const activeSocraticIndex = Math.min(socraticIndex, Math.max(0, socraticPrompts.length - 1));
  const activeSocraticPrompt = socraticPrompts[activeSocraticIndex] || '';
  const canAdvanceSocratic = activeSocraticIndex + 1 < socraticPrompts.length;

  const shouldGateSolution = Boolean(review && coachingPlan?.shouldGateSolution && socraticMode);
  const isSolutionRevealed = Boolean(
    !review || !shouldGateSolution || solutionRevealedByQuestion[currentQuestion?.id]
  );

  useEffect(() => {
    if (!currentQuestion) return;
    setCurrentInput(answers[currentQuestion.id] ?? '');
  }, [currentQuestion, answers]);

  function advanceSocraticPrompt() {
    if (!currentQuestion) return;
    const nextStep = Math.min((socraticStepByQuestion[currentQuestion.id] || 0) + 1, Math.max(0, socraticPrompts.length - 1));
    setSocraticStepByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: nextStep,
    }));
  }

  function revealSolution() {
    if (!currentQuestion) return;
    setSolutionRevealedByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }));
  }

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

        if (response?.queued) {
          setWarning('Offline mode: answer saved locally and will sync automatically when internet returns.');
        }
      } catch (error) {
        if (!hasAnswerKey(currentQuestion)) {
          setWarning('Network issue. Answer saved locally; grading may update after sync.');
        } else {
          // Keep local progress if network call fails and local key exists.
          // eslint-disable-next-line no-console
          console.warn('submitAttempt failed:', error.message);
          setWarning('Network issue: saved locally for now.');
        }
      } finally {
        setSessionBusy(false);
      }
    }

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: rawAnswer }));
    setSubmitted((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        isCorrect: resolvedCorrect,
        secondsSpent,
        answer: rawAnswer,
      },
    }));

    setSocraticStepByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: 0,
    }));

    setSolutionRevealedByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: Boolean(resolvedCorrect),
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
    const correctCount = submittedEntries.filter(([, value]) => value.isCorrect === true).length;
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
      if (value.isCorrect === true) skillBreakdown[question.skill].correct += 1;

      domainBreakdown[question.domain].attempts += 1;
      domainBreakdown[question.domain].seconds += value.secondsSpent;
      if (value.isCorrect === true) domainBreakdown[question.domain].correct += 1;
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
        const response = await completeSession(completionPayload);
        if (response?.queued) {
          setWarning('Session saved offline and queued for sync when internet returns.');
        }
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

  return (
    <section className="sat-session">
      <header className="sat-session__header">
        <h2>{title}</h2>
        <div className="sat-session__meta">
          <span>
            Q {index + 1} / {questions.length}
          </span>
          <span>
            Score {score.correct}/{score.total}
            {score.pending ? ` (+${score.pending} pending)` : ''}
          </span>
          <span>Plan {estimatedTimeLabel}</span>
          <span className={timeLimitSeconds && remainingSeconds < 180 ? 'is-danger' : ''}>
            {timeLimitSeconds ? `Time ${formatTimer(remainingSeconds)}` : `Elapsed ${formatTimer(secondsElapsed)}`}
          </span>
        </div>
      </header>

      <article className="sat-question-card">
        <label className="sat-toggle sat-toggle--compact">
          <input
            type="checkbox"
            checked={socraticMode}
            onChange={(event) => {
              const nextValue = event.target.checked;
              setSocraticMode(nextValue);
              if (!nextValue && review && currentQuestion) {
                setSolutionRevealedByQuestion((prev) => ({
                  ...prev,
                  [currentQuestion.id]: true,
                }));
              }
            }}
          />
          <span>Socratic tutor mode: guide me with coaching questions before full solution reveal.</span>
        </label>

        <div className="sat-question-card__tags">
          <span>{currentQuestion.domain}</span>
          <span>{currentQuestion.skill}</span>
          <span>Difficulty {currentQuestion.difficulty}</span>
        </div>
        <h3 className="sat-question-card__stem">{displayStem}</h3>

        {currentQuestion.format === 'multiple_choice' ? (
          <div className="sat-choice-list">
            {displayChoices.map((choice, choiceIndex) => {
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
          <div className={`sat-feedback ${review.isCorrect === true ? 'is-correct' : 'is-incorrect'}`}>
            <div className="sat-feedback__badges">
              <span className={`sat-pill ${review.isCorrect === true ? 'sat-pill--success' : 'sat-pill--danger'}`}>
                {review.isCorrect === true ? 'Correct' : 'Needs Work'}
              </span>
              <span className="sat-pill sat-pill--neutral">Type: {coachingPlan.mistakeLabel}</span>
              <span className="sat-pill sat-pill--neutral">
                Time {coachingPlan.spentSeconds}s / target {coachingPlan.targetSeconds}s
              </span>
            </div>

            <p className="sat-feedback__coach-copy">{renderCoachTone(coachTone, review)}</p>
            <p>
              <strong>Coach Diagnosis:</strong> {toStudentFriendlyMathText(coachingPlan.coachFix)}
            </p>
            <p>
              <strong>What To Do Next:</strong> {toStudentFriendlyMathText(coachingPlan.nextAction)}
            </p>

            {coachingPlan.checklist.length ? (
              <ul className="sat-list" style={{ marginTop: 8 }}>
                {toStudentFriendlyMathList(coachingPlan.checklist).map((step) => (
                  <li key={`${currentQuestion.id}-check-${step.slice(0, 16)}`}>{step}</li>
                ))}
              </ul>
            ) : null}

            {socraticPrompts.length ? (
              <div className="sat-socratic">
                <p>
                  <strong>Socratic Tutor:</strong> answer the coach question before looking at full steps.
                </p>
                {shouldGateSolution && !isSolutionRevealed ? (
                  <>
                    <p className="sat-socratic__prompt">
                      Coach question {activeSocraticIndex + 1}/{socraticPrompts.length}: {toStudentFriendlyMathText(activeSocraticPrompt)}
                    </p>
                    <div className="sat-session__actions" style={{ marginTop: 10 }}>
                      {canAdvanceSocratic ? (
                        <button className="sat-btn" type="button" onClick={advanceSocraticPrompt}>
                          Next Coach Question
                        </button>
                      ) : null}
                      <button className="sat-btn sat-btn--ghost" type="button" onClick={revealSolution}>
                        Reveal Full Solution
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="sat-muted">Socratic check complete. Use the full walkthrough below.</p>
                )}
              </div>
            ) : null}

            {isSolutionRevealed ? (
              <>
                {displaySteps.length ? (
                  <ol>
                    {displaySteps.map((step) => (
                      <li key={`${currentQuestion.id}-${step.slice(0, 14)}`}>{step}</li>
                    ))}
                  </ol>
                ) : null}
                <p>
                  <strong>Strategy:</strong> {displayStrategy}
                </p>
                <p>
                  <strong>Common trap:</strong> {displayTrap}
                </p>
                {desmosGuide ? (
                  <div className="sat-desmos-tip">
                    <p>
                      <strong>{desmosGuide.title}:</strong> Fast calculator path for this type.
                    </p>
                    <ol>
                      {toStudentFriendlyMathList(desmosGuide.steps || []).map((step) => (
                        <li key={`${currentQuestion.id}-desmos-${step.slice(0, 16)}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="sat-feedback__locked">
                Full walkthrough is locked until you complete the coach prompts or choose reveal.
              </p>
            )}
          </div>
        ) : null}
      </article>
    </section>
  );
}

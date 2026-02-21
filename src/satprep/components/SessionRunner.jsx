import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { completeSession, submitAttempt } from '../lib/apiClient';
import { buildCoachingPlan } from '../lib/coaching';
import { getDesmosGuide } from '../lib/desmosGuide';
import { estimateSessionWindow } from '../lib/sessionTime';
import { toStudentFriendlyMathList, toStudentFriendlyMathText } from '../lib/textFormat';

const SESSION_SAVE_KEY = 'satprep.activeSession.v1';

function saveSessionState(state) {
  try {
    window.localStorage.setItem(SESSION_SAVE_KEY, JSON.stringify(state));
  } catch { /* ignore quota errors */ }
}

function loadSessionState(questionIds) {
  try {
    const raw = window.localStorage.getItem(SESSION_SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const savedIds = (saved.questionIds || []).join(',');
    const currentIds = questionIds.join(',');
    if (savedIds !== currentIds) return null;
    if (Date.now() - saved.savedAt > 3 * 60 * 60 * 1000) return null;
    return saved;
  } catch { return null; }
}

function clearSessionState() {
  try { window.localStorage.removeItem(SESSION_SAVE_KEY); } catch { /* ignore */ }
}

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
  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const [resumeOffer, setResumeOffer] = useState(() => {
    const saved = loadSessionState(questionIds);
    return saved ? saved : null;
  });

  const [index, setIndex] = useState(() => resumeOffer?.index || 0);
  const [answers, setAnswers] = useState(() => resumeOffer?.answers || {});
  const [submitted, setSubmitted] = useState(() => resumeOffer?.submitted || {});
  const [currentInput, setCurrentInput] = useState('');
  const [sessionStart] = useState(() => resumeOffer?.sessionStart || Date.now());
  const [questionStart, setQuestionStart] = useState(() => Date.now());
  const [secondsElapsed, setSecondsElapsed] = useState(() => resumeOffer?.secondsElapsed || 0);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [warning, setWarning] = useState(resumeOffer ? 'Session restored from auto-save.' : '');
  const [socraticMode, setSocraticMode] = useState(true);
  const [socraticStepByQuestion, setSocraticStepByQuestion] = useState({});
  const [solutionRevealedByQuestion, setSolutionRevealedByQuestion] = useState({});

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [flagged, setFlagged] = useState(() => resumeOffer?.flagged || {});
  const [eliminated, setEliminated] = useState(() => resumeOffer?.eliminated || {});
  const [showNav, setShowNav] = useState(false);

  // Clear resume offer after initial load
  useEffect(() => { if (resumeOffer) setResumeOffer(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = questions[index] || null;
  const review = currentQuestion ? submitted[currentQuestion.id] : null;

  useEffect(() => {
    function handleKeyDown(e) {
      if (sessionBusy || !currentQuestion) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (review) {
          nextQuestion();
        } else if (currentInput !== '') {
          submitCurrentAnswer();
        }
        return;
      }
      if (!review && currentQuestion.format === 'multiple_choice') {
        const keyMap = { '1': '0', '2': '1', '3': '2', '4': '3', a: '0', b: '1', c: '2', d: '3' };
        const mapped = keyMap[e.key.toLowerCase()];
        if (mapped !== undefined && Number(mapped) < (currentQuestion.choices || []).length) {
          setCurrentInput(mapped);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  // Auto-save session state every 5 seconds for crash recovery
  useEffect(() => {
    const interval = setInterval(() => {
      saveSessionState({
        questionIds,
        index,
        answers,
        submitted,
        sessionStart,
        secondsElapsed,
        flagged,
        eliminated,
        savedAt: Date.now(),
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [questionIds, index, answers, submitted, sessionStart, secondsElapsed, flagged, eliminated]);

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

  const { displayPassage, displayStem } = useMemo(() => {
    if (currentQuestion?.passage) {
      return {
        displayPassage: toStudentFriendlyMathText(currentQuestion.passage),
        displayStem: toStudentFriendlyMathText(currentQuestion.stem || ''),
      };
    }
    const rawStem = currentQuestion?.stem || '';
    const parts = rawStem.split('\n\n');
    if (parts.length >= 2) {
      const longest = parts.reduce((a, b) => (a.length >= b.length ? a : b), '');
      const rest = parts.filter((p) => p !== longest).join(' ');
      return {
        displayPassage: toStudentFriendlyMathText(longest),
        displayStem: toStudentFriendlyMathText(rest),
      };
    }
    return {
      displayPassage: '',
      displayStem: toStudentFriendlyMathText(rawStem),
    };
  }, [currentQuestion]);

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

  function navigateToQuestion(targetIndex) {
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    setIndex(targetIndex);
    setQuestionStart(Date.now());
    setShowNav(false);
  }

  function toggleFlag() {
    if (!currentQuestion) return;
    setFlagged((prev) => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }));
  }

  function toggleElimination(questionId, choiceIndex) {
    const key = `${questionId}-${choiceIndex}`;
    setEliminated((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    clearSessionState();
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

    const sessionResult = {
      totalCount,
      attemptedCount,
      correctCount,
      accuracyPct: totalCount ? Math.round((correctCount / totalCount) * 100) : 0,
      avgSeconds: Number(avgSeconds.toFixed(1)),
      elapsedSeconds: secondsElapsed,
      mode,
      skillBreakdown,
      domainBreakdown,
    };

    try {
      const missedQuestions = submittedEntries
        .filter(([, value]) => !value.isCorrect)
        .map(([questionId, value]) => {
          const q = questions.find((qItem) => qItem.id === questionId);
          if (!q) return null;
          return {
            id: q.id,
            skill: q.skill,
            domain: q.domain,
            difficulty: q.difficulty,
            stem: String(q.stem || '').slice(0, 200),
            studentAnswer: value.answer,
            correctAnswer: q.answer_key,
            secondsSpent: value.secondsSpent,
          };
        })
        .filter(Boolean);

      const historyEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        mode,
        ...sessionResult,
        missedQuestions,
      };
      const history = JSON.parse(window.localStorage.getItem('satprep.sessionHistory.v1') || '[]');
      history.push(historyEntry);
      if (history.length > 50) history.splice(0, history.length - 50);
      window.localStorage.setItem('satprep.sessionHistory.v1', JSON.stringify(history));
    } catch {
      // ignore storage errors
    }

    onFinish?.(sessionResult);
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
          <button type="button" className="sat-btn sat-btn--ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowNav(!showNav)}>
            {showNav ? 'Hide' : 'Nav'}
          </button>
        </div>
      </header>

      {showNav ? (
        <div className="sat-q-nav" role="navigation" aria-label="Question navigator">
          {questions.map((q, i) => {
            let cls = 'sat-q-nav__btn';
            if (i === index) cls += ' is-current';
            if (submitted[q.id]) cls += ' is-answered';
            if (flagged[q.id]) cls += ' is-flagged';
            return (
              <button key={q.id} type="button" className={cls} onClick={() => navigateToQuestion(i)} aria-label={`Question ${i + 1}${flagged[q.id] ? ' (flagged)' : ''}${submitted[q.id] ? ' (answered)' : ''}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      ) : null}

      {timeLimitSeconds ? (() => {
        const expectedProgress = secondsElapsed / timeLimitSeconds;
        const actualProgress = Object.keys(submitted).length / questions.length;
        const paceStatus = actualProgress >= expectedProgress - 0.05 ? 'on-pace' : 'behind-pace';
        const progressPct = Math.min(100, Math.round(actualProgress * 100));
        const timePct = Math.min(100, Math.round(expectedProgress * 100));
        return (
          <div className="sat-pacing-bar">
            <div className="sat-pacing-bar__track">
              <div className="sat-pacing-bar__time" style={{ width: `${timePct}%` }} />
              <div className={`sat-pacing-bar__progress sat-pacing-bar__progress--${paceStatus}`} style={{ width: `${progressPct}%` }} />
            </div>
            <div className="sat-pacing-bar__labels">
              <span>{progressPct}% done</span>
              <span className={paceStatus === 'behind-pace' ? 'is-danger' : ''}>
                {paceStatus === 'on-pace' ? 'On pace' : 'Behind pace'} — checkpoint: {Math.round(questions.length / 2)} Q by {formatTimer(Math.round(timeLimitSeconds / 2))}
              </span>
              <span>{timePct}% time used</span>
            </div>
          </div>
        );
      })() : null}

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
        {displayPassage ? (
          <div className="sat-passage">
            <p>{displayPassage}</p>
          </div>
        ) : null}
        <h3 className="sat-question-card__stem">{displayStem}</h3>

        {currentQuestion.format === 'multiple_choice' ? (
          <div className="sat-choice-list">
            {displayChoices.map((choice, choiceIndex) => {
              const checked = String(currentInput) === String(choiceIndex);
              const isCorrectChoice = review && Number(currentQuestion.answer_key) === choiceIndex;
              const isWrongPick = review && checked && !review.isCorrect;
              const isEliminated = !review && eliminated[`${currentQuestion.id}-${choiceIndex}`];
              let choiceClass = 'sat-choice';
              if (!review && checked) choiceClass += ' is-selected';
              if (isCorrectChoice) choiceClass += ' is-correct-choice';
              if (isWrongPick) choiceClass += ' is-wrong-choice';
              if (isEliminated) choiceClass += ' is-eliminated';
              return (
                <div key={`${currentQuestion.id}-choice-${choiceIndex}`} style={{ position: 'relative' }}>
                  <button
                    className={choiceClass}
                    type="button"
                    onClick={() => setCurrentInput(String(choiceIndex))}
                    disabled={!!review}
                  >
                    <span className="sat-choice__letter">{String.fromCharCode(65 + choiceIndex)}</span>
                    <span>{choice}</span>
                  </button>
                  {!review ? (
                    <button
                      type="button"
                      className="sat-choice__elim"
                      onClick={(e) => { e.stopPropagation(); toggleElimination(currentQuestion.id, choiceIndex); }}
                      aria-label={isEliminated ? `Restore choice ${String.fromCharCode(65 + choiceIndex)}` : `Eliminate choice ${String.fromCharCode(65 + choiceIndex)}`}
                    >
                      {isEliminated ? '\u21A9' : '\u2715'}
                    </button>
                  ) : null}
                </div>
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
          <button
            className={`sat-btn sat-btn--ghost${flagged[currentQuestion.id] ? ' is-flagged' : ''}`}
            onClick={toggleFlag}
            type="button"
            aria-pressed={!!flagged[currentQuestion.id]}
            title="Flag this question for review"
          >
            {flagged[currentQuestion.id] ? '\u2691 Flagged' : '\u2690 Flag'}
          </button>
          {!confirmEnd ? (
            <button className="sat-btn sat-btn--ghost" onClick={() => setConfirmEnd(true)} type="button" disabled={sessionBusy}>
              End Session
            </button>
          ) : (
            <>
              <button className="sat-btn sat-btn--danger" onClick={finalizeSession} type="button" disabled={sessionBusy}>
                Confirm End ({questions.length - Object.keys(submitted).length} unanswered)
              </button>
              <button className="sat-btn sat-btn--ghost" onClick={() => setConfirmEnd(false)} type="button">
                Cancel
              </button>
            </>
          )}
          <span className="sat-shortcut-hint">
            {currentQuestion.format === 'multiple_choice' && !review
              ? 'Keys: A/B/C/D to select, Enter to submit'
              : review
                ? 'Press Enter for next question'
                : 'Press Enter to submit'}
          </span>
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

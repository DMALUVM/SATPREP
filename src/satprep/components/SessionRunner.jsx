import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { completeSession, fetchAiExplanation, fetchAiFollowUp, submitAttempt } from '../lib/apiClient';
import { buildCoachingPlan } from '../lib/coaching';
import { getDesmosGuide } from '../lib/desmosGuide';
import { estimateSessionWindow } from '../lib/sessionTime';
import { recordMisses, recordCorrectReview, recordWrongReview } from '../lib/spacedRepetition';
import MathText from './MathText';

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
    if (Date.now() - saved.savedAt > 12 * 60 * 60 * 1000) return null;
    // Validate saved index is within bounds
    if (typeof saved.index !== 'number' || saved.index < 0 || saved.index >= questionIds.length) {
      saved.index = 0;
    }
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
  const [aiExplanations, setAiExplanations] = useState({});
  const [aiConversations, setAiConversations] = useState({});
  const [aiFollowUpInput, setAiFollowUpInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [sessionFinalized, setSessionFinalized] = useState(false);

  // Refs for auto-save (avoids re-creating interval on every state change)
  const stateRef = useRef({ questionIds, index, answers, submitted, sessionStart, secondsElapsed, flagged, eliminated });
  stateRef.current = { questionIds, index, answers, submitted, sessionStart, secondsElapsed, flagged, eliminated };

  // Clear resume offer after initial load
  useEffect(() => { if (resumeOffer) setResumeOffer(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = questions[index] || null;
  const review = currentQuestion ? submitted[currentQuestion.id] : null;

  // Keyboard handler — uses refs/deps to avoid stale closures
  useEffect(() => {
    function handleKeyDown(e) {
      if (sessionBusy || !currentQuestion || sessionFinalized) return;
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
  }); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally re-binds every render

  // Timer — stops after finalization
  useEffect(() => {
    if (sessionFinalized) return undefined;
    const timer = setInterval(() => {
      setSecondsElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStart, sessionFinalized]);

  // Time-limit auto-finish
  useEffect(() => {
    if (!timeLimitSeconds || sessionFinalized) return undefined;
    if (secondsElapsed >= timeLimitSeconds) {
      finalizeSession();
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsElapsed, timeLimitSeconds, sessionFinalized]);

  // Auto-save every 5 seconds (single stable interval via ref)
  useEffect(() => {
    if (sessionFinalized) return undefined;
    const interval = setInterval(() => {
      const s = stateRef.current;
      saveSessionState({ ...s, savedAt: Date.now() });
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionFinalized]);

  // Warn before tab close during active session
  useEffect(() => {
    if (sessionFinalized) return undefined;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionFinalized]);

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

  const { rawPassage, rawStem } = useMemo(() => {
    if (currentQuestion?.passage) {
      return {
        rawPassage: currentQuestion.passage,
        rawStem: currentQuestion.stem || '',
      };
    }
    const stem = currentQuestion?.stem || '';
    const parts = stem.split('\n\n');
    if (parts.length >= 2) {
      const longest = parts.reduce((a, b) => (a.length >= b.length ? a : b), '');
      const rest = parts.filter((p) => p !== longest).join(' ');
      return { rawPassage: longest, rawStem: rest };
    }
    return { rawPassage: '', rawStem: stem };
  }, [currentQuestion]);

  const rawChoices = currentQuestion?.choices || [];
  const rawSteps = currentQuestion?.explanation_steps || [];
  const rawStrategy = currentQuestion?.strategy_tip || '';
  const rawTrap = currentQuestion?.trap_tag || '';

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
    if (sessionBusy || targetIndex < 0 || targetIndex >= questions.length) return;
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

  async function requestAiExplanation() {
    if (!currentQuestion || !review || aiLoading) return;
    // Return cached explanation if we already have one for this question
    if (aiExplanations[currentQuestion.id]) return;

    setAiLoading(true);
    setAiError('');
    try {
      const isVerbal = mode === 'verbal' || mode === 'verbal-reading' || mode === 'verbal-writing';
      const result = await fetchAiExplanation({
        stem: String(currentQuestion.stem || '').slice(0, 1000),
        choices: currentQuestion.choices || [],
        student_answer: review.answer,
        correct_answer: currentQuestion.answer_key,
        skill: currentQuestion.skill,
        domain: currentQuestion.domain,
        section: isVerbal ? 'verbal' : 'math',
      });
      setAiExplanations((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          text: result.explanation,
          remaining: result.daily_remaining,
        },
      }));
    } catch (err) {
      setAiError(err.message || 'AI tutor unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  }

  async function sendAiFollowUp() {
    if (!currentQuestion || !aiFollowUpInput.trim() || aiLoading) return;
    const questionId = currentQuestion.id;
    const initialExplanation = aiExplanations[questionId]?.text || '';
    const prevMessages = aiConversations[questionId] || [];

    setAiLoading(true);
    setAiError('');
    try {
      const isVerbal = mode === 'verbal' || mode === 'verbal-reading' || mode === 'verbal-writing';
      const result = await fetchAiFollowUp({
        stem: String(currentQuestion.stem || '').slice(0, 1000),
        choices: currentQuestion.choices || [],
        student_answer: submitted[questionId]?.answer,
        correct_answer: currentQuestion.answer_key,
        skill: currentQuestion.skill,
        domain: currentQuestion.domain,
        section: isVerbal ? 'verbal' : 'math',
        initial_explanation: initialExplanation,
        conversation: [...prevMessages, { role: 'user', content: aiFollowUpInput.trim() }],
      });

      setAiConversations((prev) => ({
        ...prev,
        [questionId]: [
          ...(prev[questionId] || []),
          { role: 'user', content: aiFollowUpInput.trim() },
          { role: 'tutor', content: result.explanation },
        ],
      }));
      setAiFollowUpInput('');
    } catch (err) {
      setAiError(err.message || 'Follow-up failed.');
    } finally {
      setAiLoading(false);
    }
  }

  async function submitCurrentAnswer() {
    if (!currentQuestion || sessionBusy || sessionFinalized) return;

    const rawAnswer = currentQuestion.format === 'multiple_choice' ? currentInput : normalizeGridAnswer(currentInput);
    if (rawAnswer === '' || rawAnswer === null || rawAnswer === undefined) return;

    // Lock immediately to prevent double-submit / navigate-during-submit
    setSessionBusy(true);
    setWarning('');

    let resolvedCorrect = isAnswerCorrect(currentQuestion, rawAnswer);
    const secondsSpent = Math.max(1, Math.floor((Date.now() - questionStart) / 1000));

    if (persistApi) {
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

    // Spaced repetition: track review outcomes
    if (mode === 'review') {
      if (resolvedCorrect) {
        recordCorrectReview(currentQuestion.id);
      } else {
        recordWrongReview(currentQuestion.id);
      }
    }

    setSocraticStepByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: 0,
    }));

    setSolutionRevealedByQuestion((prev) => ({
      ...prev,
      [currentQuestion.id]: Boolean(resolvedCorrect),
    }));

    setSessionBusy(false);
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
    if (sessionBusy || sessionFinalized) return;
    setSessionFinalized(true);
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

    // Collect wrong answers + unanswered questions for review
    const wrongQuestions = submittedEntries
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

    const unansweredQuestions = questions
      .filter((q) => !submitted[q.id])
      .map((q) => ({
        id: q.id,
        skill: q.skill,
        domain: q.domain,
        difficulty: q.difficulty,
        stem: String(q.stem || '').slice(0, 200),
        studentAnswer: null,
        correctAnswer: q.answer_key,
        secondsSpent: 0,
      }));

    const missedQuestions = [...wrongQuestions, ...unansweredQuestions];

    // Spaced repetition: schedule missed questions for future review
    if (missedQuestions.length) {
      recordMisses(missedQuestions);
    }

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
      missedQuestionIds: missedQuestions.map((q) => q.id),
    };

    try {

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
        {rawPassage ? (
          <div className="sat-passage">
            <p><MathText text={rawPassage} /></p>
          </div>
        ) : null}
        <h3 className="sat-question-card__stem"><MathText text={rawStem} /></h3>

        {currentQuestion.format === 'multiple_choice' ? (
          <div className="sat-choice-list">
            {rawChoices.map((choice, choiceIndex) => {
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
                    <span><MathText text={choice} /></span>
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
          <button
            className="sat-btn sat-btn--ghost"
            type="button"
            disabled={sessionBusy}
            onClick={() => {
              const s = stateRef.current;
              saveSessionState({ ...s, savedAt: Date.now() });
              onExit?.();
            }}
          >
            Pause
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
            {review
              ? (index + 1 >= questions.length ? 'Press Enter to finish session' : 'Press Enter for next question')
              : currentQuestion.format === 'multiple_choice'
                ? 'Keys: A/B/C/D to select, Enter to submit'
                : 'Type your answer, then press Enter to submit'}
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
              <strong>Coach Diagnosis:</strong> <MathText text={coachingPlan.coachFix} />
            </p>
            <p>
              <strong>What To Do Next:</strong> <MathText text={coachingPlan.nextAction} />
            </p>

            {coachingPlan.checklist.length ? (
              <ul className="sat-list" style={{ marginTop: 8 }}>
                {coachingPlan.checklist.map((step, i) => (
                  <li key={`${currentQuestion.id}-check-${i}`}><MathText text={step} /></li>
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
                      Coach question {activeSocraticIndex + 1}/{socraticPrompts.length}: <MathText text={activeSocraticPrompt} />
                    </p>
                    <div className="sat-session__actions" style={{ marginTop: 10 }}>
                      {canAdvanceSocratic ? (
                        <button className="sat-btn" type="button" onClick={advanceSocraticPrompt}>
                          Next Coach Question
                        </button>
                      ) : (
                        <span className="sat-muted">All coach questions answered.</span>
                      )}
                      <button className="sat-btn sat-btn--ghost" type="button" onClick={revealSolution}>
                        Reveal Full Solution
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="sat-muted">Socratic check complete. Use the full walkthrough below.</p>
                )}
              </div>
            ) : shouldGateSolution && !isSolutionRevealed ? (
              <div className="sat-socratic">
                <p className="sat-muted">No coach questions available for this type.</p>
                <button className="sat-btn sat-btn--ghost" type="button" onClick={revealSolution} style={{ marginTop: 6 }}>
                  Reveal Full Solution
                </button>
              </div>
            ) : null}

            {isSolutionRevealed ? (
              <>
                {rawSteps.length ? (
                  <ol>
                    {rawSteps.map((step, i) => (
                      <li key={`${currentQuestion.id}-step-${i}`}><MathText text={step} /></li>
                    ))}
                  </ol>
                ) : null}
                <p>
                  <strong>Strategy:</strong> <MathText text={rawStrategy} />
                </p>
                <p>
                  <strong>Common trap:</strong> <MathText text={rawTrap} />
                </p>
                {desmosGuide ? (
                  <div className="sat-desmos-tip">
                    <p>
                      <strong>{desmosGuide.title}:</strong> Fast calculator path for this type.
                    </p>
                    <ol>
                      {(desmosGuide.steps || []).map((step, i) => (
                        <li key={`${currentQuestion.id}-desmos-${i}`}><MathText text={step} /></li>
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

            {mode !== 'timed' && mode !== 'diagnostic' && (
              <div className="sat-ai-tutor">
                {aiExplanations[currentQuestion.id] ? (
                  <>
                    <div className="sat-ai-tutor__header">
                      <strong>AI Tutor Explanation</strong>
                      <span className="sat-pill sat-pill--neutral">{aiExplanations[currentQuestion.id].remaining} AI uses left today</span>
                    </div>
                    <div className="sat-ai-tutor__body">
                      {aiExplanations[currentQuestion.id].text}
                    </div>

                    {(aiConversations[currentQuestion.id] || []).map((msg, i) => (
                      <div
                        key={`${currentQuestion.id}-ai-msg-${i}`}
                        className={msg.role === 'user' ? 'sat-ai-tutor__user-msg' : 'sat-ai-tutor__body'}
                        style={{ marginTop: 8 }}
                      >
                        {msg.role === 'user' ? (
                          <><strong>You:</strong> {msg.content}</>
                        ) : (
                          msg.content
                        )}
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <input
                        type="text"
                        className="sat-ai-tutor__followup-input"
                        placeholder="I still don't understand..."
                        value={aiFollowUpInput}
                        onChange={(e) => setAiFollowUpInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendAiFollowUp(); } }}
                        disabled={aiLoading}
                        style={{ flex: 1, border: '1px solid var(--sat-line)', borderRadius: 10, padding: '8px 12px', font: 'inherit', fontSize: 14 }}
                      />
                      <button
                        type="button"
                        className="sat-btn sat-btn--primary"
                        onClick={sendAiFollowUp}
                        disabled={aiLoading || !aiFollowUpInput.trim()}
                      >
                        {aiLoading ? 'Thinking...' : 'Ask'}
                      </button>
                    </div>

                    <p className="sat-ai-tutor__disclaimer">
                      AI explanations are grounded in the question data. Always verify against the step-by-step walkthrough above.
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`sat-btn ${review.isCorrect ? 'sat-btn--ghost' : 'sat-btn--primary'}`}
                      onClick={requestAiExplanation}
                      disabled={aiLoading}
                      style={{ marginTop: 8 }}
                    >
                      {aiLoading ? (
                        <><span className="sat-loader sat-loader--sm" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} aria-hidden="true" />Thinking...</>
                      ) : review.isCorrect ? 'AI Deep Dive' : 'Ask AI Tutor: Why is my answer wrong?'}
                    </button>
                    {aiError ? <div className="sat-alert sat-alert--danger" style={{ marginTop: 6 }}>{aiError}</div> : null}
                  </>
                )}
              </div>
            )}
          </div>
        ) : null}
      </article>
    </section>
  );
}

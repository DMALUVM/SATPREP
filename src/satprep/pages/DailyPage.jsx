import React, { useEffect, useMemo, useState } from 'react';
import AiStatusBadge from '../components/AiStatusBadge';
import MistakeJournal from '../components/MistakeJournal';
import SessionRunner from '../components/SessionRunner';
import SessionSummary from '../components/SessionSummary';
import { buildAdaptiveVerbalSet, buildVerbalSet } from '../content/verbalQuestionBank';
import { generateDailyMission } from '../lib/apiClient';
import { buildAdaptivePracticeSet, buildPracticeSet, getQuestionById } from '../lib/selection';
import { getDueReviewIds, getReviewStats } from '../lib/spacedRepetition';
import { getSupabaseBrowserClient } from '../lib/supabaseBrowser';
import { friendlyDate, getPhaseForDay, getPlanDay, SAT_PLAN_TOTAL_DAYS, SAT_TEST_DATE, setPlanDates, toDateKey } from '../lib/time';

const COACH_PLAYBOOK = {
  'linear-equations': [
    'Isolate variables one operation at a time and keep equality balanced.',
    'Substitute the solved value back immediately to verify.',
  ],
  systems: [
    'Choose elimination when coefficients align; otherwise substitute.',
    'After solving, check both original equations quickly.',
  ],
  inequalities: [
    'Treat like equations but flip the sign when multiplying/dividing by negative.',
    'Test one value from your final interval to confirm direction.',
  ],
  quadratics: [
    'First factor if possible; if not, use quadratic formula cleanly.',
    'Verify roots in original form to avoid sign slips.',
  ],
  functions: [
    'Track input-output mapping and evaluate inside-out for composition.',
    'When comparing functions, anchor on rate and intercept behavior.',
  ],
  percentages: [
    'Translate percent statements into equations before calculating.',
    'Use multiplier form (1 +/- r) for fast growth/decay questions.',
  ],
  statistics: [
    'Separate mean/median spread questions before computing.',
    'Estimate first, then compute exact value to catch arithmetic errors.',
  ],
};

function mergeQuestionsById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    const current = map.get(item.id) || {};
    map.set(item.id, {
      ...current,
      ...item,
    });
  });
  return [...map.values()];
}

function buildSkillActionRow(row) {
  const skill = row?.skill || 'unknown-skill';
  const mastery = Number(row?.mastery_score || 0).toFixed(1);
  const instructions = COACH_PLAYBOOK[skill] || [
    'Solve slowly once for setup accuracy, then repeat once at timer pace.',
    'Write one mistake pattern and one prevention rule before ending session.',
  ];

  return {
    skill,
    mastery,
    instructions,
  };
}

function NextStepBanner({ hasDiagnostic, mission, missionQuestionCount, phase, navigate }) {
  let heading = '';
  let detail = '';
  let action = null;

  if (!hasDiagnostic) {
    heading = 'Step 1: Run Your Diagnostic';
    detail = 'You have not run a diagnostic yet. This 24-question baseline test tells the app exactly where you are strong and weak so it can build your custom daily plan.';
    action = (
      <button type="button" className="sat-btn sat-btn--primary" onClick={() => navigate('/diagnostic')}>
        Go to Diagnostic
      </button>
    );
  } else if (!mission) {
    heading = 'Step 1: Pick Your Time and Generate';
    detail = 'Choose how much time you have today, then press Generate. The app handles everything — math first, then verbal, all in one flow.';
  } else if (phase === 'math-paused') {
    heading = 'Resume Your Math Session';
    detail = 'You paused mid-session. Pick up right where you left off — your progress is saved.';
  } else if (phase === 'verbal-paused') {
    heading = 'Resume Your Verbal Session';
    detail = 'Math is done! Resume your verbal session to complete today\'s mission.';
  } else if (missionQuestionCount > 0 && phase === 'idle') {
    heading = 'Step 2: Start Your Mission';
    detail = `Your mission is ready with ${missionQuestionCount} math questions, then verbal. Press Start below and work straight through — the app handles the transitions.`;
  } else if (phase === 'complete') {
    heading = 'Mission Complete';
    detail = 'Great session. Check your progress or do extra practice below if you have more time.';
    action = (
      <button type="button" className="sat-btn sat-btn--primary" onClick={() => navigate('/progress')}>
        Check Progress
      </button>
    );
  }

  if (!heading) return null;

  return (
    <div className="sat-next-step">
      <div className="sat-next-step__badge">DO THIS NOW</div>
      <h3 className="sat-next-step__heading">{heading}</h3>
      <p className="sat-next-step__detail">{detail}</p>
      {action}
    </div>
  );
}

function DailyProjection() {
  const projection = useMemo(() => {
    try {
      const raw = window.localStorage.getItem('satprep.sessionHistory.v1');
      const history = raw ? JSON.parse(raw) : [];
      if (history.length < 2) return null;

      const today = toDateKey();
      const planDay = getPlanDay(today);
      const daysRemaining = Math.max(0, SAT_PLAN_TOTAL_DAYS - planDay);

      const totalCorrect = history.reduce((s, h) => s + (h.correctCount || 0), 0);
      const totalAttempts = history.reduce((s, h) => s + (h.totalCount || 0), 0);
      if (totalAttempts < 5) return null;

      const accuracy = totalCorrect / totalAttempts;
      const projectedScore = Math.round(200 + accuracy * 600);
      const reviewStats = getReviewStats();

      return { daysRemaining, projectedScore, totalSessions: history.length, accuracy, reviewStats };
    } catch {
      return null;
    }
  }, []);

  if (!projection) return null;

  const onTrack = projection.projectedScore * 2 >= 1300;
  return (
    <div className="sat-alert" style={{ marginTop: 12, borderLeft: `3px solid ${onTrack ? 'var(--sat-success)' : 'var(--sat-warning)'}` }}>
      <strong>Test Day Projection:</strong> Math ~{projection.projectedScore} ({Math.round(projection.accuracy * 100)}% accuracy across {projection.totalSessions} sessions)
      {' \u2022 '}{projection.daysRemaining} days remaining
      {projection.reviewStats.due_today > 0 ? ` \u2022 ${projection.reviewStats.due_today} review questions due` : ''}
    </div>
  );
}

function TestDateEditor({ profile, onUpdateProfile }) {
  const currentTestDate = profile?.settings?.sat_test_date || SAT_TEST_DATE;
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(currentTestDate);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function saveTestDate() {
    if (!dateValue || dateValue === currentTestDate) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const settings = { ...(profile?.settings || {}), sat_test_date: dateValue };
      const { data, error } = await supabase
        .from('sat_profiles')
        .update({ settings, updated_at: new Date().toISOString() })
        .eq('user_id', profile.user_id)
        .select('*')
        .single();
      if (error) throw error;
      // Update the plan in memory so all components pick up the new dates
      setPlanDates(data.sat_start_date || profile.sat_start_date, dateValue);
      onUpdateProfile?.(data);
      setEditing(false);
    } catch (err) {
      setSaveError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="sat-btn sat-btn--ghost"
        style={{ fontSize: 13, padding: '4px 10px' }}
        onClick={() => setEditing(true)}
      >
        Change test date
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <input
        type="date"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        min={toDateKey()}
        style={{ fontSize: 14, padding: '4px 8px' }}
      />
      <button type="button" className="sat-btn sat-btn--primary" style={{ fontSize: 13, padding: '4px 10px' }} onClick={saveTestDate} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" className="sat-btn sat-btn--ghost" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => setEditing(false)}>
        Cancel
      </button>
      {saveError ? <span style={{ color: 'var(--sat-danger)', fontSize: 13 }}>{saveError}</span> : null}
    </div>
  );
}

function SpacedReviewBanner({ today, onStartReview }) {
  const dueIds = useMemo(() => getDueReviewIds(today), [today]);
  const stats = useMemo(() => getReviewStats(), []);

  if (!dueIds.length) return null;

  return (
    <div className="sat-next-step" style={{ borderColor: 'var(--sat-warning)' }}>
      <div className="sat-next-step__badge" style={{ background: 'var(--sat-warning)' }}>SPACED REVIEW</div>
      <h3 className="sat-next-step__heading">{dueIds.length} question{dueIds.length !== 1 ? 's' : ''} due for review</h3>
      <p className="sat-next-step__detail">
        These are questions you missed before. Reviewing them at the right intervals locks the learning in.
        {stats.upcoming > 0 ? ` (${stats.upcoming} more scheduled for later this week)` : ''}
      </p>
      <button
        type="button"
        className="sat-btn sat-btn--primary"
        onClick={() => onStartReview(dueIds)}
      >
        Start Spaced Review ({dueIds.length} Q)
      </button>
    </div>
  );
}

const MISSION_SAVE_KEY = 'satprep.dailyMission.v1';

function saveMissionState(data) {
  try {
    window.localStorage.setItem(MISSION_SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function loadMissionState(today) {
  try {
    const raw = window.localStorage.getItem(MISSION_SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Only restore if it's for today and less than 12 hours old
    if (saved.planDate !== today) return null;
    if (Date.now() - saved.savedAt > 12 * 60 * 60 * 1000) return null;
    return saved;
  } catch { return null; }
}

function clearMissionState() {
  try { window.localStorage.removeItem(MISSION_SAVE_KEY); } catch { /* ignore */ }
}

const INTENSITY_OPTIONS = [
  { key: 'light', label: 'Light', minutes: 30, verbalCount: 8, description: '~40 min total' },
  { key: 'standard', label: 'Standard', minutes: 55, verbalCount: 14, description: '~75 min total' },
  { key: 'extended', label: 'Extended', minutes: 90, verbalCount: 20, description: '~2 hrs total' },
];

export default function DailyPage({ onRefreshProgress, progressMetrics, navigate, profile, onUpdateProfile }) {
  const today = toDateKey();

  const [mission, setMission] = useState(null);
  const [missionMeta, setMissionMeta] = useState(null);
  const [missionQuestions, setMissionQuestions] = useState([]);
  const [missionOffline, setMissionOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [intensity, setIntensity] = useState('standard');
  const [reviewQuestions, setReviewQuestions] = useState(null);

  // Multi-phase flow: idle → math → verbal → complete
  const [phase, setPhase] = useState('idle');
  const [mathSummary, setMathSummary] = useState(null);
  const [verbalSummary, setVerbalSummary] = useState(null);
  const [verbalQuestions, setVerbalQuestions] = useState([]);
  const [extraQuestions, setExtraQuestions] = useState(null);
  const [extraMode, setExtraMode] = useState(null);

  // Restore saved mission on mount (e.g., after pause or page reload)
  useEffect(() => {
    const saved = loadMissionState(today);
    if (saved?.mission) {
      setMission(saved.mission);
      setMissionMeta(saved.missionMeta || null);
      setMissionQuestions(saved.missionQuestions || []);
      setMissionOffline(Boolean(saved.offline));
      if (saved.intensity) setIntensity(saved.intensity);
      if (saved.verbalQuestions?.length) setVerbalQuestions(saved.verbalQuestions);
      if (saved.phase && saved.phase !== 'idle') setPhase(saved.phase);
    }
  }, [today]);

  const planDay = getPlanDay(today);
  const currentPhase = getPhaseForDay(planDay);
  const missionMinutes = mission?.target_minutes || 55;
  const weakSkillRows = (progressMetrics?.weak_skills || []).slice(0, 3).map(buildSkillActionRow);
  const hasDiagnostic = (progressMetrics?.totals?.attempts || 0) > 0;
  const daysLeft = Math.max(0, SAT_PLAN_TOTAL_DAYS - planDay);
  const phaseFocus = currentPhase
    ? `${currentPhase.name} Phase (Days ${currentPhase.startDay}-${currentPhase.endDay}): ${currentPhase.focus}`
    : 'Follow your daily mission and focus on weak skills.';

  const missionQuestionList = useMemo(() => {
    if (!mission) return [];
    const ids = mission.tasks.flatMap((task) => task.question_ids || []);

    const fromApi = ids.map((id) => missionQuestions.find((q) => q.id === id)).filter(Boolean);
    const fromLocal = ids.map((id) => getQuestionById(id)).filter(Boolean);
    const merged = mergeQuestionsById([...fromApi, ...fromLocal]);

    return ids
      .map((id) => merged.find((q) => q.id === id))
      .filter(Boolean);
  }, [mission, missionQuestions]);

  const selectedIntensity = INTENSITY_OPTIONS.find((o) => o.key === intensity) || INTENSITY_OPTIONS[1];

  // Check if there's a paused session waiting to resume
  const hasPausedSession = useMemo(() => {
    try {
      const raw = window.localStorage.getItem('satprep.activeSession.v1');
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (Date.now() - saved.savedAt > 12 * 60 * 60 * 1000) return false;
      const missionIds = (mission?.tasks || []).flatMap((t) => t.question_ids || []).join(',');
      const verbalIds = verbalQuestions.map((q) => q.id).join(',');
      const savedIds = saved.questionIds?.join(',');
      return savedIds && (savedIds === missionIds || savedIds === verbalIds);
    } catch { return false; }
  }, [mission, verbalQuestions]);

  function generateVerbalSet() {
    const count = selectedIntensity.verbalCount;
    const verbal = progressMetrics?.verbal;
    if (verbal?.weak_skills?.length) {
      return buildAdaptiveVerbalSet({
        section: 'mixed',
        count,
        difficulty: 'all',
        weakSkills: verbal.weak_skills,
        strongSkills: verbal.strong_skills || [],
      });
    }
    return buildVerbalSet({ section: 'mixed', count, difficulty: 'all' });
  }

  // Auto-advance to complete if verbal phase has no questions
  useEffect(() => {
    if (phase === 'verbal' && mission && !verbalQuestions.length) {
      savePhase('complete');
      clearMissionState();
    }
  }, [phase, mission, verbalQuestions]);

  async function fetchMission() {
    setBusy(true);
    setError('');
    try {
      const data = await generateDailyMission({ plan_date: today, target_minutes: selectedIntensity.minutes });
      setMission(data.mission);
      setMissionMeta(data.mission_metadata || null);
      setMissionQuestions(data.questions || []);
      setMissionOffline(Boolean(data.offline));
      setPhase('idle');
      setMathSummary(null);
      setVerbalSummary(null);
      setExtraQuestions(null);
      setExtraMode(null);
      // Clear old session auto-save so it doesn't conflict with new mission
      try { window.localStorage.removeItem('satprep.activeSession.v1'); } catch { /* ignore */ }
      // Generate verbal questions up front so they're ready
      const vSet = generateVerbalSet();
      setVerbalQuestions(vSet);
      // Persist everything
      saveMissionState({
        planDate: today,
        mission: data.mission,
        missionMeta: data.mission_metadata || null,
        missionQuestions: data.questions || [],
        offline: Boolean(data.offline),
        intensity: selectedIntensity.key,
        verbalQuestions: vSet,
        phase: 'idle',
      });
    } catch (err) {
      setError(err.message || 'Failed to generate mission');
    } finally {
      setBusy(false);
    }
  }

  function handleReviewMistakes(missedIds) {
    const reviewSet = missedIds.map(getQuestionById).filter(Boolean);
    if (reviewSet.length) {
      setMathSummary(null);
      setVerbalSummary(null);
      setReviewQuestions(reviewSet);
    }
  }

  function startExtraPractice(type) {
    let questions;
    if (type === 'math') {
      questions = progressMetrics?.weak_skills?.length
        ? buildAdaptivePracticeSet({ progressMetrics, count: 12 })
        : buildPracticeSet({ count: 12, difficulty: 'all', domain: 'all', skill: 'all' });
    } else {
      questions = generateVerbalSet();
    }
    if (questions.length) {
      setExtraQuestions(questions);
      setExtraMode(type);
    }
  }

  function savePhase(p) {
    setPhase(p);
    try {
      const raw = window.localStorage.getItem(MISSION_SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        saved.phase = p;
        saved.savedAt = Date.now();
        window.localStorage.setItem(MISSION_SAVE_KEY, JSON.stringify(saved));
      }
    } catch { /* ignore */ }
  }

  // --- Session renderers (take over the full page) ---

  if (reviewQuestions) {
    return (
      <SessionRunner
        title={`Review ${reviewQuestions.length} Missed Question${reviewQuestions.length !== 1 ? 's' : ''}`}
        mode="review"
        questions={reviewQuestions}
        planDate={today}
        onExit={() => setReviewQuestions(null)}
        onFinish={(result) => {
          setReviewQuestions(null);
          setMathSummary(result);
          onRefreshProgress?.();
        }}
      />
    );
  }

  if (extraQuestions) {
    return (
      <SessionRunner
        title={`Extra ${extraMode === 'math' ? 'Math' : 'Verbal'} Practice`}
        mode="practice"
        questions={extraQuestions}
        planDate={today}
        onExit={() => setExtraQuestions(null)}
        onFinish={(result) => {
          setExtraQuestions(null);
          if (extraMode === 'math') setMathSummary(result);
          else setVerbalSummary(result);
          setExtraMode(null);
          onRefreshProgress?.();
        }}
      />
    );
  }

  if (phase === 'math' && missionQuestionList.length) {
    return (
      <SessionRunner
        title={`Day ${planDay} Math Mission`}
        mode="practice"
        questions={missionQuestionList}
        planDate={today}
        plannedTimeLabel={`${missionMinutes} min`}
        missionUpdate={{
          enabled: true,
          status: 'in_progress',
          tasks: mission?.tasks || [],
          target_minutes: missionMinutes,
          completed_tasks: mission?.tasks?.length || 1,
        }}
        onExit={() => savePhase('math-paused')}
        onFinish={(result) => {
          setMathSummary(result);
          savePhase('verbal');
          onRefreshProgress?.();
        }}
      />
    );
  }

  if (phase === 'verbal' && verbalQuestions.length) {
    const verbalMinutes = Math.round(verbalQuestions.length * 85 / 60);
    return (
      <SessionRunner
        title={`Day ${planDay} Verbal Session`}
        mode="practice"
        questions={verbalQuestions}
        planDate={today}
        timeLimitSeconds={verbalQuestions.length * 85}
        plannedTimeLabel={`${verbalMinutes} min`}
        missionUpdate={{
          enabled: true,
          status: 'complete',
          tasks: mission?.tasks || [],
          target_minutes: missionMinutes + verbalMinutes,
          completed_tasks: (mission?.tasks?.length || 1) + 1,
        }}
        onExit={() => savePhase('verbal-paused')}
        onFinish={(result) => {
          setVerbalSummary(result);
          savePhase('complete');
          clearMissionState();
          onRefreshProgress?.();
        }}
      />
    );
  }

  return (
    <section className="sat-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Daily Mission Console</h2>
        <AiStatusBadge />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0 }}>
          {friendlyDate(today)} {'\u2022'} Day {planDay} of {SAT_PLAN_TOTAL_DAYS} {'\u2022'} {daysLeft} day{daysLeft !== 1 ? 's' : ''} to test ({friendlyDate(SAT_TEST_DATE)})
        </p>
        {profile ? <TestDateEditor profile={profile} onUpdateProfile={onUpdateProfile} /> : null}
      </div>

      <SpacedReviewBanner today={today} onStartReview={(ids) => {
        const reviewSet = ids.map(getQuestionById).filter(Boolean);
        if (reviewSet.length) {
          setMathSummary(null);
          setVerbalSummary(null);
          setReviewQuestions(reviewSet);
        } else {
          setError('Could not load review questions. They may have been removed from the question bank. The review queue has been cleared for these items.');
        }
      }} />

      <NextStepBanner
        hasDiagnostic={hasDiagnostic}
        mission={mission}
        missionQuestionCount={missionQuestionList.length}
        phase={phase}
        navigate={navigate}
      />

      <div className="sat-alert">{phaseFocus}</div>

      <DailyProjection />

      {missionOffline ? (
        <div className="sat-alert" style={{ marginTop: 12 }}>
          Offline mission mode: this plan is running locally and will sync to cloud after reconnect.
        </div>
      ) : null}

      {phase !== 'complete' ? (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>How much time today?</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {INTENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`sat-btn ${intensity === opt.key ? 'sat-btn--primary' : 'sat-btn--ghost'}`}
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => setIntensity(opt.key)}
              >
                {opt.label} — {opt.description}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="sat-actions-row" style={{ marginTop: 12 }}>
        {phase !== 'complete' ? (
          <button type="button" className="sat-btn sat-btn--primary" onClick={fetchMission} disabled={busy}>
            {busy ? 'Generating\u2026' : mission ? 'Regenerate Mission' : `Generate ${selectedIntensity.label} Mission`}
          </button>
        ) : null}
        {missionQuestionList.length > 0 && (phase === 'idle' || phase === 'math-paused' || phase === 'verbal-paused') ? (
          <button
            type="button"
            className="sat-btn"
            onClick={() => savePhase(phase === 'verbal-paused' ? 'verbal' : 'math')}
          >
            {phase === 'math-paused' || phase === 'verbal-paused' || hasPausedSession ? 'Resume' : 'Start'} Mission ({missionQuestionList.length} math + {verbalQuestions.length} verbal Q)
          </button>
        ) : null}
      </div>

      {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}

      {mission ? (
        <div className="sat-grid-2" style={{ marginTop: 16 }}>
          {mission.tasks.map((task) => (
            <article key={task.type} className="sat-task-card">
              <h3>{task.label}</h3>
              <p>{task.guidance || 'Follow the block and execute under timer pressure.'}</p>
              <div className="sat-task-card__meta">
                <span>{task.target_minutes} min</span>
                <span>{(task.question_ids || []).length} q</span>
              </div>
            </article>
          ))}
          {verbalQuestions.length ? (
            <article className="sat-task-card" style={{ borderLeft: '3px solid var(--sat-primary)' }}>
              <h3>Verbal 700+ Drill</h3>
              <p>Mixed reading and writing — adaptive to your weak verbal skills.</p>
              <div className="sat-task-card__meta">
                <span>{Math.round(verbalQuestions.length * 85 / 60)} min</span>
                <span>{verbalQuestions.length} q</span>
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {missionMeta ? (
        <div className="sat-alert" style={{ marginTop: 12 }}>
          Adaptive targeting: weak skills first ({missionMeta.weakest_skill}, {missionMeta.second_skill})
          {Array.isArray(missionMeta.deprioritized_skills) && missionMeta.deprioritized_skills.length
            ? `; deprioritized for now: ${missionMeta.deprioritized_skills.slice(0, 3).join(', ')}`
            : ''}.
        </div>
      ) : null}

      <div className="sat-task-card" style={{ marginTop: 16, padding: 14 }}>
        <h3>Your Daily Session</h3>
        <ol className="sat-list">
          <li><strong>Pick your time</strong> — choose Light, Standard, or Extended above.</li>
          <li><strong>Generate and start</strong> — the app builds math + verbal in one flow.</li>
          <li><strong>Work straight through</strong> — math first, then verbal auto-starts. Use Enter and A/B/C/D shortcuts.</li>
          <li><strong>Review every miss</strong> — read the coaching feedback and correct each error.</li>
          <li><strong>Extra practice</strong> — if you have time, do a bonus round after you finish.</li>
        </ol>
      </div>

      {weakSkillRows.length ? (
        <div className="sat-panel" style={{ marginTop: 16 }}>
          <h3>Coach Priorities For Today</h3>
          {weakSkillRows.map((row) => (
            <article key={row.skill} className="sat-task-card" style={{ marginTop: 10 }}>
              <strong>{row.skill}</strong> (mastery {row.mastery})
              <ol className="sat-list" style={{ marginTop: 8 }}>
                {row.instructions.map((step) => (
                  <li key={`${row.skill}-${step.slice(0, 18)}`}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : null}

      {mathSummary ? (
        <SessionSummary summary={mathSummary} onDismiss={() => setMathSummary(null)} onReviewMistakes={handleReviewMistakes} />
      ) : null}

      {verbalSummary ? (
        <div style={{ marginTop: 16 }}>
          <h3>Verbal Session Results</h3>
          <SessionSummary summary={verbalSummary} onDismiss={() => setVerbalSummary(null)} />
        </div>
      ) : null}

      {phase === 'complete' ? (
        <div className="sat-next-step" style={{ marginTop: 16, borderColor: 'var(--sat-success)' }}>
          <div className="sat-next-step__badge" style={{ background: 'var(--sat-success)' }}>EXTRA PRACTICE</div>
          <h3 className="sat-next-step__heading">Got more time?</h3>
          <p className="sat-next-step__detail">
            Your daily mission is done. If you want to keep going, pick a bonus round below.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="sat-btn sat-btn--primary" onClick={() => startExtraPractice('math')}>
              Bonus Math (12 Q)
            </button>
            <button type="button" className="sat-btn" onClick={() => startExtraPractice('verbal')}>
              Bonus Verbal ({selectedIntensity.verbalCount} Q)
            </button>
          </div>
        </div>
      ) : null}

      <MistakeJournal />
    </section>
  );
}

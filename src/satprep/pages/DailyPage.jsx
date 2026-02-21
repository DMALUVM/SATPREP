import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import SessionSummary from '../components/SessionSummary';
import { generateDailyMission } from '../lib/apiClient';
import { getQuestionById } from '../lib/selection';
import { friendlyDate, getPlanDay, getWeekForDay, toDateKey } from '../lib/time';

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

function NextStepBanner({ hasDiagnostic, mission, missionQuestionCount, summary, navigate }) {
  let stepNumber = 1;
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
    heading = 'Step 1: Generate Today\'s Mission';
    detail = 'Press the button below to build your personalized daily plan. The app will target your weakest skills first.';
    action = null; // The generate button is below
  } else if (missionQuestionCount > 0 && !summary) {
    heading = 'Step 2: Start Your Mission';
    detail = `Your mission is ready with ${missionQuestionCount} questions. Press Start Mission below, then work through each question. Use Enter key to submit answers quickly.`;
    action = null; // The start button is below
  } else if (summary) {
    heading = 'Step 3: Do Your Verbal Session';
    detail = 'Math mission complete. Now switch to Verbal 700+ for a 15-20 minute reading and writing drill. Do this at least 5 days per week.';
    action = (
      <button type="button" className="sat-btn sat-btn--primary" onClick={() => navigate('/verbal')}>
        Go to Verbal 700+
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

export default function DailyPage({ onRefreshProgress, progressMetrics }) {
  const [mission, setMission] = useState(null);
  const [missionMeta, setMissionMeta] = useState(null);
  const [missionQuestions, setMissionQuestions] = useState([]);
  const [missionOffline, setMissionOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);

  const today = toDateKey();
  const planDay = getPlanDay(today);
  const planWeek = getWeekForDay(planDay);
  const missionMinutes = mission?.target_minutes || 55;
  const weakSkillRows = (progressMetrics?.weak_skills || []).slice(0, 3).map(buildSkillActionRow);
  const hasDiagnostic = (progressMetrics?.totals?.attempts || 0) > 0;
  const weekFocus =
    planWeek === 1
      ? 'Week 1 Foundation: equations, graphing, systems, and clean setup.'
      : planWeek === 2
        ? 'Week 2 Core Skills: percentages, statistics, quadratics, and function fluency.'
        : planWeek === 3
          ? 'Week 3 Level-Up: medium-hard mixed sets under time pressure.'
          : 'Week 4 Peak Mode: full simulations, error loop tightening, and confidence execution.';

  const missionQuestionList = useMemo(() => {
    if (!mission) return [];
    const ids = mission.tasks.flatMap((task) => task.question_ids || []);

    const fromApi = ids.map((id) => missionQuestions.find((q) => q.id === id)).filter(Boolean);
    const fromLocal = ids.map((id) => getQuestionById(id)).filter(Boolean);
    const merged = mergeQuestionsById([...fromApi, ...fromLocal]);

    // Keep original task order stable.
    return ids
      .map((id) => merged.find((q) => q.id === id))
      .filter(Boolean);
  }, [mission, missionQuestions]);

  async function fetchMission() {
    setBusy(true);
    setError('');
    try {
      const data = await generateDailyMission({ plan_date: today });
      setMission(data.mission);
      setMissionMeta(data.mission_metadata || null);
      setMissionQuestions(data.questions || []);
      setMissionOffline(Boolean(data.offline));
      setSummary(null);
    } catch (err) {
      setError(err.message || 'Failed to generate mission');
    } finally {
      setBusy(false);
    }
  }

  if (running && missionQuestionList.length) {
    return (
      <SessionRunner
        title={`Day ${planDay} Mission`}
        mode="practice"
        questions={missionQuestionList}
        planDate={today}
        plannedTimeLabel={`${missionMinutes} min`}
        missionUpdate={{
          enabled: true,
          status: 'complete',
          tasks: mission?.tasks || [],
          target_minutes: missionMinutes,
          completed_tasks: mission?.tasks?.length || 1,
        }}
        onExit={() => setRunning(false)}
        onFinish={(result) => {
          setRunning(false);
          setSummary(result);
          onRefreshProgress?.();
        }}
      />
    );
  }

  return (
    <section className="sat-panel">
      <h2>Daily Mission Console</h2>
      <p>
        {friendlyDate(today)} &bull; Day {planDay} of 28 &bull; Week {planWeek}
      </p>

      <NextStepBanner
        hasDiagnostic={hasDiagnostic}
        mission={mission}
        missionQuestionCount={missionQuestionList.length}
        summary={summary}
        navigate={(path) => {
          window.history.pushState(null, '', `/sat-prep${path}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />

      <div className="sat-alert">{weekFocus}</div>

      {missionOffline ? (
        <div className="sat-alert" style={{ marginTop: 12 }}>
          Offline mission mode: this plan is running locally and will sync to cloud after reconnect.
        </div>
      ) : null}

      <div className="sat-actions-row" style={{ marginTop: 12 }}>
        <button type="button" className="sat-btn sat-btn--primary" onClick={fetchMission} disabled={busy}>
          {busy ? 'Generating\u2026' : mission ? 'Regenerate Mission' : 'Generate Today\'s Mission'}
        </button>
        {missionQuestionList.length ? (
          <button type="button" className="sat-btn" onClick={() => setRunning(true)}>
            Start Mission ({missionQuestionList.length} questions, ~{missionMinutes} min)
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
        <h3>Your Daily Session Checklist</h3>
        <ol className="sat-list">
          <li><strong>Generate mission</strong> — press the button above to build today's plan.</li>
          <li><strong>Start mission</strong> — work all questions. Use Enter key and A/B/C/D shortcuts.</li>
          <li><strong>Review every miss</strong> — read the coaching feedback and correct each error.</li>
          <li><strong>Verbal 700+</strong> — switch to Verbal page for 15-20 min of reading/writing.</li>
          <li><strong>Check Progress</strong> — see your updated score on the Progress page.</li>
        </ol>
      </div>

      <div className="sat-grid-2" style={{ marginTop: 16 }}>
        <article className="sat-task-card">
          <h3>Foolproof Math Protocol</h3>
          <ol className="sat-list">
            <li>Start with warmup misses, then adaptive drill, then timed block.</li>
            <li>For each miss, classify it: concept gap, setup error, or time panic.</li>
            <li>Rework every miss correctly before ending the session.</li>
            <li>Write two rules to apply tomorrow before signing off.</li>
          </ol>
        </article>
        <article className="sat-task-card">
          <h3>Verbal Add-On (20 min)</h3>
          <ol className="sat-list">
            <li>Run the Verbal 700+ page after math at least 5 days/week.</li>
            <li>Alternate reading and writing focus days.</li>
            <li>Keep pace under 85 sec/question with evidence-based choices.</li>
            <li>Aim for verbal 700+ while math climbs to 650-700.</li>
          </ol>
        </article>
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

      {summary ? (
        <SessionSummary summary={summary} onDismiss={() => setSummary(null)} />
      ) : null}
    </section>
  );
}

import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import { generateDailyMission } from '../lib/apiClient';
import { getQuestionById } from '../lib/selection';
import { friendlyDate, getPlanDay, getWeekForDay, toDateKey } from '../lib/time';

function uniqueById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return [...map.values()];
}

export default function DailyPage({ onRefreshProgress }) {
  const [mission, setMission] = useState(null);
  const [missionMeta, setMissionMeta] = useState(null);
  const [missionQuestions, setMissionQuestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [running, setRunning] = useState(false);

  const today = toDateKey();
  const planDay = getPlanDay(today);
  const planWeek = getWeekForDay(planDay);
  const missionMinutes = mission?.target_minutes || 55;
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
    return uniqueById([...fromApi, ...fromLocal]);
  }, [mission, missionQuestions]);

  async function fetchMission() {
    setBusy(true);
    setError('');
    try {
      const data = await generateDailyMission({ plan_date: today });
      setMission(data.mission);
      setMissionMeta(data.mission_metadata || null);
      setMissionQuestions(data.questions || []);
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
        {friendlyDate(today)} • Day {planDay} of 28 • Week {planWeek}
      </p>
      <div className="sat-alert">{weekFocus}</div>

      <div className="sat-actions-row">
        <button type="button" className="sat-btn sat-btn--primary" onClick={fetchMission} disabled={busy}>
          {busy ? 'Generating…' : 'Generate Today\'s Mission'}
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

      <div className="sat-grid-2" style={{ marginTop: 16 }}>
        <article className="sat-task-card">
          <h3>Foolproof Math Protocol</h3>
          <ol className="sat-list">
            <li>Start with warmup mistakes, then adaptive drill, then timed block.</li>
            <li>Mark every miss as one of: concept gap, setup error, or time panic.</li>
            <li>Rework every miss correctly before ending the session.</li>
            <li>Log two rules to apply tomorrow before signing off.</li>
          </ol>
        </article>
        <article className="sat-task-card">
          <h3>Verbal Add-On (20 min)</h3>
          <ol className="sat-list">
            <li>Run `/sat-prep/verbal` after math at least 5 days/week.</li>
            <li>Alternate reading and writing focus days.</li>
            <li>Keep pace under 85 sec/question with evidence-based choices.</li>
            <li>Aim for verbal 700+ while math climbs to 650-700.</li>
          </ol>
        </article>
      </div>

      {summary ? (
        <div className="sat-alert sat-alert--success" style={{ marginTop: 16 }}>
          Mission block complete: {summary.correctCount}/{summary.totalCount} ({summary.accuracyPct}%),
          pace {summary.avgSeconds}s.
        </div>
      ) : null}
    </section>
  );
}

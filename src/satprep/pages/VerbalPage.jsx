import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import { buildAdaptiveVerbalSet, buildVerbalSet, getVerbalStats } from '../content/verbalQuestionBank';
import { estimateSessionFromConfig } from '../lib/sessionTime';
import { computeVerbalMetrics, getVerbalProgress, recordVerbalSession } from '../lib/verbalProgress';

const STRATEGY_PLAYBOOK = [
  {
    title: 'Reading Main-Idea Lock',
    steps: [
      'Read for argument first, details second.',
      'State the main claim in your own words before options.',
      'Eliminate any answer that overstates scope or certainty.',
    ],
  },
  {
    title: 'Evidence Discipline',
    steps: [
      'For each answer, point to exact proof text.',
      'If you cannot cite proof, it is not the right answer.',
      'Reject "sounds right" answers with no direct support.',
    ],
  },
  {
    title: 'Writing Grammar Speed',
    steps: [
      'Check boundaries: sentence vs fragment vs splice.',
      'Check agreement: subject-verb and pronoun consistency.',
      'Choose concise wording once grammar is correct.',
    ],
  },
  {
    title: 'Time Control',
    steps: [
      'Target ~75-85s per verbal question.',
      'If stuck >90s, eliminate two and move.',
      'Return with remaining time; never stall early.',
    ],
  },
];

export default function VerbalPage() {
  const [section, setSection] = useState('mixed');
  const [difficulty, setDifficulty] = useState('all');
  const [count, setCount] = useState(22);
  const [runningSet, setRunningSet] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [progressVersion, setProgressVersion] = useState(0);
  const [useAdaptive, setUseAdaptive] = useState(true);

  const stats = useMemo(() => getVerbalStats(), []);
  const metrics = useMemo(() => computeVerbalMetrics(getVerbalProgress()), [progressVersion]);
  const estimate = useMemo(
    () => estimateSessionFromConfig({ count, difficulty, section: 'verbal' }),
    [count, difficulty]
  );

  const timeLimitSeconds = useMemo(() => {
    const perQuestion = section === 'verbal-writing' ? 75 : 85;
    return count * perQuestion;
  }, [section, count]);

  if (runningSet) {
    return (
      <SessionRunner
        title="Verbal Precision Drill"
        mode="practice"
        questions={runningSet}
        timeLimitSeconds={timeLimitSeconds}
        coachTone="firm-supportive"
        onExit={() => setRunningSet(null)}
        onFinish={(result) => {
          setRunningSet(null);
          setSessionSummary(result);
          recordVerbalSession(result, { section, difficulty, count, timeLimitSeconds });
          setProgressVersion((v) => v + 1);
        }}
      />
    );
  }

  return (
    <section className="sat-panel">
      <h2>Verbal 700+ Command Center</h2>
      <p>
        Structured Reading + Writing coaching. Purpose: move verbal from 600 to 700+ with timed accuracy and
        decision discipline.
      </p>
      <p>
        Estimated session time: <strong>{estimate.label}</strong>
      </p>

      <div className="sat-stats-grid" style={{ marginBottom: 14 }}>
        <article className="sat-stat sat-stat--primary">
          <div className="sat-stat__label">Estimated Verbal</div>
          <div className="sat-stat__value">{metrics.estimatedVerbalScore}</div>
          <div className="sat-stat__detail">Goal: 700+</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Accuracy</div>
          <div className="sat-stat__value">{metrics.accuracy}%</div>
          <div className="sat-stat__detail">{metrics.correct}/{metrics.attempts} correct</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Pace</div>
          <div className="sat-stat__value">{metrics.avgPace || 0}s</div>
          <div className="sat-stat__detail">Target: ≤85s</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Bank</div>
          <div className="sat-stat__value">{stats.total}</div>
          <div className="sat-stat__detail">{stats.reading} reading / {stats.writing} writing</div>
        </article>
      </div>

      {useAdaptive && metrics.weakSkills.length ? (
        <div className="sat-alert">
          Adaptive verbal focus is ON. Priority skills: {metrics.weakSkills.slice(0, 3).map((row) => row.skill).join(', ')}.
          {metrics.strongSkills.length ? ` Deprioritizing: ${metrics.strongSkills.slice(0, 2).map((row) => row.skill).join(', ')}.` : ''}
        </div>
      ) : null}

      <div className="sat-grid-form">
        <label>
          Section
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            <option value="mixed">Mixed</option>
            <option value="verbal-reading">Reading</option>
            <option value="verbal-writing">Writing</option>
          </select>
        </label>

        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="all">all</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>

        <label>
          Questions
          <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
            <option value={16}>16</option>
            <option value={22}>22</option>
            <option value={30}>30</option>
          </select>
        </label>

        <label>
          Timer
          <input value={`${Math.round(timeLimitSeconds / 60)} min`} disabled readOnly />
        </label>
      </div>

      <label className="sat-toggle">
        <input
          type="checkbox"
          checked={useAdaptive}
          onChange={(event) => setUseAdaptive(event.target.checked)}
        />
        <span>Auto-focus weak verbal skills (reduce repetition on mastered skills)</span>
      </label>

      <div className="sat-actions-row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="sat-btn sat-btn--primary"
          onClick={() => {
            const set = useAdaptive
              ? buildAdaptiveVerbalSet({
                section,
                count,
                difficulty,
                weakSkills: metrics.weakSkills,
                strongSkills: metrics.strongSkills,
              })
              : buildVerbalSet({ section, count, difficulty });
            setRunningSet(set);
          }}
        >
          Start Verbal Drill
        </button>
      </div>

      {sessionSummary ? (
        <div className="sat-alert sat-alert--success">
          Verbal session complete: {sessionSummary.correctCount}/{sessionSummary.totalCount} ({sessionSummary.accuracyPct}%),
          pace {sessionSummary.avgSeconds}s.
        </div>
      ) : null}

      <div className="sat-grid-2" style={{ marginTop: 14 }}>
        {STRATEGY_PLAYBOOK.map((module) => (
          <article key={module.title} className="sat-task-card">
            <h3>{module.title}</h3>
            <ol className="sat-list" style={{ marginTop: 8 }}>
              {module.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

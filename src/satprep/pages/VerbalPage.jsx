import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import { buildAdaptiveVerbalSet, buildVerbalSet, getVerbalStats } from '../content/verbalQuestionBank';
import { estimateSessionFromConfig } from '../lib/sessionTime';

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

const VERBAL_SKILL_COACH = {
  'main-idea': [
    'Summarize passage claim in 8-12 words before viewing choices.',
    'Reject choices that are narrower or broader than the passage claim.',
  ],
  inference: [
    'Only choose conclusions supported by direct text evidence.',
    'If you cannot underline proof for a choice, eliminate it.',
  ],
  'vocab-in-context': [
    'Replace the word with each choice and re-read sentence meaning.',
    'Match tone and context, not dictionary familiarity alone.',
  ],
  'textual-evidence': [
    'Find proof line first, then pick answer aligned to that line.',
    'Avoid true-but-irrelevant details.',
  ],
  'subject-verb-agreement': [
    'Find the true subject, then match singular/plural verb.',
    'Ignore interrupting phrases between subject and verb.',
  ],
  'punctuation-boundaries': [
    'Identify whether each side is an independent clause.',
    'Use semicolon/period/conjunction rules to avoid comma splice traps.',
  ],
  'logical-transitions': [
    'Name the relationship first: contrast, cause, continuation, or example.',
    'Pick transition matching that relationship exactly.',
  ],
  concision: [
    'Remove redundancy after grammar is correct.',
    'Prefer the clearest shortest choice that preserves meaning.',
  ],
};

function buildDefaultVerbalMetrics() {
  return {
    predicted_verbal_score: 0,
    attempts: 0,
    correct: 0,
    accuracy_pct: 0,
    pace_seconds: 0,
    weak_skills: [],
    strong_skills: [],
  };
}

export default function VerbalPage({ progressMetrics, onRefreshProgress }) {
  const [section, setSection] = useState('mixed');
  const [difficulty, setDifficulty] = useState('all');
  const [count, setCount] = useState(22);
  const [runningSet, setRunningSet] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [useAdaptive, setUseAdaptive] = useState(true);

  const stats = useMemo(() => getVerbalStats(), []);
  const metrics = progressMetrics?.verbal || buildDefaultVerbalMetrics();
  const weakSkills = metrics.weak_skills || [];
  const strongSkills = metrics.strong_skills || [];
  const estimate = useMemo(
    () => estimateSessionFromConfig({ count, difficulty, section: 'verbal' }),
    [count, difficulty]
  );

  const focusInstructions = useMemo(() => {
    return weakSkills.slice(0, 3).map((row) => ({
      skill: row.skill,
      mastery: Number(row.mastery_score || 0).toFixed(1),
      steps: VERBAL_SKILL_COACH[row.skill] || [
        'Do one slow untimed rep focused on evidence and structure.',
        'Do one timed rep and keep pace under 85s/question.',
      ],
    }));
  }, [weakSkills]);

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
          onRefreshProgress?.();
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
          <div className="sat-stat__value">{metrics.predicted_verbal_score || 0}</div>
          <div className="sat-stat__detail">Goal: 700+</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Accuracy</div>
          <div className="sat-stat__value">{metrics.accuracy_pct || 0}%</div>
          <div className="sat-stat__detail">{metrics.correct || 0}/{metrics.attempts || 0} correct</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Pace</div>
          <div className="sat-stat__value">{metrics.pace_seconds || 0}s</div>
          <div className="sat-stat__detail">Target: ≤85s</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Bank</div>
          <div className="sat-stat__value">{stats.total}</div>
          <div className="sat-stat__detail">{stats.reading} reading / {stats.writing} writing</div>
        </article>
      </div>

      {useAdaptive && weakSkills.length ? (
        <div className="sat-alert">
          Adaptive verbal focus is ON. Priority skills: {weakSkills.slice(0, 3).map((row) => row.skill).join(', ')}.
          {strongSkills.length ? ` Deprioritizing: ${strongSkills.slice(0, 2).map((row) => row.skill).join(', ')}.` : ''}
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
                weakSkills,
                strongSkills,
              })
              : buildVerbalSet({ section, count, difficulty });
            setRunningSet(set);
          }}
        >
          Start Verbal Drill
        </button>
      </div>

      {focusInstructions.length ? (
        <div className="sat-panel" style={{ marginTop: 8 }}>
          <h3>Today\'s Verbal Coaching Priorities</h3>
          {focusInstructions.map((row) => (
            <article key={row.skill} className="sat-task-card" style={{ marginTop: 10 }}>
              <strong>{row.skill}</strong> (mastery {row.mastery})
              <ol className="sat-list" style={{ marginTop: 8 }}>
                {row.steps.map((step) => (
                  <li key={`${row.skill}-${step.slice(0, 18)}`}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      ) : null}

      {sessionSummary ? (
        <div className="sat-alert sat-alert--success">
          Verbal session complete: {sessionSummary.correctCount}/{sessionSummary.totalCount} ({sessionSummary.accuracyPct}%),
          attempted {sessionSummary.attemptedCount}, pace {sessionSummary.avgSeconds}s.
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

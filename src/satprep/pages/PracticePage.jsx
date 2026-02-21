import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import {
  buildAdaptivePracticeSet,
  buildPracticeSet,
  listDomains,
  listSkills,
} from '../lib/selection';
import { estimateSessionFromConfig } from '../lib/sessionTime';
import { toDateKey } from '../lib/time';

export default function PracticePage({ onRefreshProgress, progressMetrics }) {
  const domains = useMemo(() => ['all', ...listDomains()], []);
  const [domain, setDomain] = useState('all');
  const [skill, setSkill] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [count, setCount] = useState(12);
  const [sessionQuestions, setSessionQuestions] = useState(null);
  const [useAdaptive, setUseAdaptive] = useState(true);

  const skills = useMemo(() => ['all', ...listSkills(domain)], [domain]);
  const weakSkills = (progressMetrics?.weak_skills || []).map((row) => row.skill).filter(Boolean);
  const estimate = useMemo(
    () => estimateSessionFromConfig({ count, difficulty, section: 'math' }),
    [count, difficulty]
  );

  if (sessionQuestions) {
    return (
      <SessionRunner
        title={useAdaptive ? 'Adaptive Practice' : 'Practice Session'}
        mode="practice"
        questions={sessionQuestions}
        planDate={toDateKey()}
        onExit={() => setSessionQuestions(null)}
        onFinish={() => {
          setSessionQuestions(null);
          onRefreshProgress?.();
        }}
      />
    );
  }

  return (
    <section className="sat-panel">
      <h2>Practice Builder</h2>
      <p>Target exact weaknesses or run mixed sets when energy is high.</p>
      <p>
        Estimated session time: <strong>{estimate.label}</strong>
      </p>
      {useAdaptive && weakSkills.length ? (
        <div className="sat-alert">
          Adaptive focus is ON. The set will heavily prioritize weak skills: {weakSkills.slice(0, 3).join(', ')}.
        </div>
      ) : null}

      <div className="sat-grid-form">
        <label>
          Domain
          <select value={domain} onChange={(event) => {
            setDomain(event.target.value);
            setSkill('all');
          }}>
            {domains.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label>
          Skill
          <select value={skill} onChange={(event) => setSkill(event.target.value)}>
            {skills.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
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
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </label>
      </div>

      <label className="sat-toggle">
        <input
          type="checkbox"
          checked={useAdaptive}
          onChange={(event) => setUseAdaptive(event.target.checked)}
        />
        <span>Auto-focus weak skills (avoid over-practicing mastered areas)</span>
      </label>

      <button
        type="button"
        className="sat-btn sat-btn--primary"
        onClick={() => {
          const selected = useAdaptive && skill === 'all'
            ? buildAdaptivePracticeSet({ progressMetrics, domain, difficulty, count })
            : buildPracticeSet({ domain, skill, difficulty, count });
          setSessionQuestions(selected);
        }}
      >
        Start Practice Session
      </button>
    </section>
  );
}

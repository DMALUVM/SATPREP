import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import SessionSummary from '../components/SessionSummary';
import { buildTimedSet } from '../lib/selection';
import { toDateKey } from '../lib/time';

const FULL_SECTION_TIME = 70 * 60;

export default function TimedPage({ onRefreshProgress }) {
  const [started, setStarted] = useState(false);
  const [summary, setSummary] = useState(null);
  const questions = useMemo(() => buildTimedSet(44), [started]);

  if (started) {
    return (
      <SessionRunner
        title="Timed SAT Math Simulation (44 Q / 70 min)"
        mode="timed"
        questions={questions}
        planDate={toDateKey()}
        timeLimitSeconds={FULL_SECTION_TIME}
        onExit={() => setStarted(false)}
        onFinish={(result) => {
          setStarted(false);
          setSummary(result);
          onRefreshProgress?.();
        }}
      />
    );
  }

  return (
    <section className="sat-panel">
      <h2>Timed Test Mode</h2>
      <p>
        Full SAT-style pressure: 44 questions and 70-minute countdown.
        Use first pass + second pass strategy. No blank answers.
      </p>
      <ul className="sat-list">
        <li>Estimated duration: 70 minutes</li>
        <li>Checkpoint pace: ~22 questions by 35 minutes</li>
        <li>2-minute rule: if stuck, guess and move</li>
        <li>Post-session review is mandatory</li>
      </ul>
      <button type="button" className="sat-btn sat-btn--primary" onClick={() => setStarted(true)}>
        Start Timed Simulation
      </button>
      {summary ? (
        <SessionSummary summary={summary} onDismiss={() => setSummary(null)} />
      ) : null}
    </section>
  );
}

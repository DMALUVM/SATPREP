import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import SessionSummary from '../components/SessionSummary';
import { buildDiagnosticSet } from '../lib/selection';
import { estimateSessionWindow } from '../lib/sessionTime';
import { toDateKey } from '../lib/time';

export default function DiagnosticPage({ onRefreshProgress }) {
  const [started, setStarted] = useState(false);
  const [summary, setSummary] = useState(null);
  const questions = useMemo(() => buildDiagnosticSet(), []);
  const estimate = useMemo(() => estimateSessionWindow({ questions }), [questions]);

  if (started) {
    return (
      <SessionRunner
        title="Full Diagnostic (24 Questions)"
        mode="diagnostic"
        questions={questions}
        planDate={toDateKey()}
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
      <h2>Diagnostic Baseline</h2>
      <p>
        This is Day 1 calibration. You will run 24 mixed questions across algebra, advanced math,
        problem-solving/data, and geometry/trig.
      </p>
      <ul className="sat-list">
        <li>Estimated duration: {estimate.label}</li>
        <li>Standard SAT pacing target: 95 sec/question</li>
        <li>Goal: expose weak skills quickly, not perfection</li>
        <li>Result drives adaptive daily missions</li>
      </ul>

      <div className="sat-grid-2" style={{ marginTop: 12 }}>
        <article className="sat-task-card">
          <h3>How To Run Diagnostic Correctly</h3>
          <ol className="sat-list">
            <li>Take it fresh. No notes, no retries, no outside help.</li>
            <li>If stuck past ~95 seconds, make best choice and move.</li>
            <li>Do not pause to learn mid-test. Learning comes after.</li>
            <li>Finish all items so the app gets true pacing data.</li>
          </ol>
        </article>
        <article className="sat-task-card">
          <h3>What To Do Right After</h3>
          <ol className="sat-list">
            <li>Go to Daily Mission and run the generated weak-skill plan.</li>
            <li>Log your top 2 mistake types from the diagnostic.</li>
            <li>Do one short verbal session (16-22 questions).</li>
            <li>Re-run diagnostic weekly only if trend stalls.</li>
          </ol>
        </article>
      </div>
      <button type="button" className="sat-btn sat-btn--primary" onClick={() => setStarted(true)}>
        Start Diagnostic
      </button>

      {summary ? (
        <SessionSummary summary={summary} onDismiss={() => setSummary(null)} />
      ) : null}
    </section>
  );
}

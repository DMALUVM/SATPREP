import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
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
      <button type="button" className="sat-btn sat-btn--primary" onClick={() => setStarted(true)}>
        Start Diagnostic
      </button>

      {summary ? (
        <div className="sat-alert sat-alert--success" style={{ marginTop: 16 }}>
          Diagnostic complete: {summary.correctCount}/{summary.totalCount} correct ({summary.accuracyPct}%),
          avg pace {summary.avgSeconds}s.
        </div>
      ) : null}
    </section>
  );
}

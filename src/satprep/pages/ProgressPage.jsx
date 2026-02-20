import React from 'react';
import StatCard from '../components/StatCard';
import { computeVerbalMetrics, getVerbalProgress } from '../lib/verbalProgress';

export default function ProgressPage({ progress, userId }) {
  const metrics = progress?.metrics;
  const verbal = computeVerbalMetrics(getVerbalProgress());
  if (!metrics) {
    return (
      <section className="sat-panel">
        <h2>Progress</h2>
        <p>Run at least one diagnostic or practice session to populate analytics.</p>
      </section>
    );
  }

  const totals = metrics.totals;
  const domainEntries = Object.entries(metrics.domain_breakdown || {});

  return (
    <section className="sat-panel">
      <h2>Progress Analytics</h2>
      <p>Student ID: <code>{userId}</code></p>

      <div className="sat-stats-grid">
        <StatCard label="Predicted Math" value={totals.predicted_math_score} detail="Target 650+" tone="primary" />
        <StatCard label="Predicted Verbal" value={verbal.estimatedVerbalScore} detail="Target 700+" tone="primary" />
        <StatCard label="Accuracy" value={`${totals.accuracy_pct}%`} detail={`${totals.correct}/${totals.attempts} correct`} />
        <StatCard label="Pace" value={`${totals.pace_seconds}s`} detail="Goal ≤95s/question" />
        <StatCard label="Streak" value={`${metrics.streak_days} days`} detail="Daily mission consistency" />
      </div>

      {domainEntries.length ? (
        <div className="sat-table-wrap" style={{ marginTop: 18 }}>
          <h3>Domain Breakdown</h3>
          <table className="sat-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Accuracy</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {domainEntries.map(([domain, data]) => (
                <tr key={domain}>
                  <td>{domain}</td>
                  <td>{data.accuracy}%</td>
                  <td>{data.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

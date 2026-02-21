import React from 'react';
import StatCard from '../components/StatCard';

export default function ProgressPage({ progress, userId }) {
  const metrics = progress?.metrics;
  if (!metrics) {
    return (
      <section className="sat-panel">
        <h2>Progress</h2>
        <p>Run at least one diagnostic or practice session to populate analytics.</p>
      </section>
    );
  }

  const totals = metrics.totals;
  const verbal = metrics.verbal || {};
  const domainEntries = Object.entries(metrics.domain_breakdown || {});

  return (
    <section className="sat-panel">
      <h2>Progress Analytics</h2>
      <p>Student ID: <code>{userId}</code></p>

      <div className="sat-stats-grid">
        <StatCard label="Predicted Math" value={totals.predicted_math_score || 0} detail="Target 650+" tone="primary" />
        <StatCard label="Predicted Verbal" value={verbal.predicted_verbal_score || 0} detail="Target 700+" tone="primary" />
        <StatCard label="Math Accuracy" value={`${totals.accuracy_pct}%`} detail={`${totals.correct}/${totals.attempts} correct`} />
        <StatCard label="Math Pace" value={`${totals.pace_seconds}s`} detail="Goal ≤95s/question" />
        <StatCard label="Verbal Accuracy" value={`${verbal.accuracy_pct || 0}%`} detail={`${verbal.correct || 0}/${verbal.attempts || 0} correct`} />
        <StatCard label="Verbal Pace" value={`${verbal.pace_seconds || 0}s`} detail="Goal ≤85s/question" />
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

      {(verbal.weak_skills || []).length ? (
        <div className="sat-table-wrap" style={{ marginTop: 18 }}>
          <h3>Verbal Weak Skills</h3>
          <table className="sat-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Mastery</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {(verbal.weak_skills || []).map((row) => (
                <tr key={row.skill}>
                  <td>{row.skill}</td>
                  <td>{Number(row.mastery_score || 0).toFixed(1)}</td>
                  <td>{row.total_attempts || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

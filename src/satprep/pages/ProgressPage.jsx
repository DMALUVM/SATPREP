import React, { useMemo, useState } from 'react';
import StatCard from '../components/StatCard';

function combinedScoreTone(score) {
  if (score >= 1300) return 'success';
  if (score >= 1200) return 'primary';
  return 'default';
}

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
  const combinedScore = (totals.predicted_math_score || 0) + (verbal.predicted_verbal_score || 0);
  const gap = Math.max(0, 1300 - combinedScore);
  const mathWeakSkills = metrics.weak_skills || [];

  return (
    <section className="sat-panel">
      <h2>Progress Analytics</h2>

      <div className="sat-combined-score">
        <div className={`sat-combined-score__value sat-combined-score__value--${combinedScoreTone(combinedScore)}`}>
          {combinedScore || '—'}
        </div>
        <div className="sat-combined-score__detail">
          <strong>Predicted Combined Score</strong>
          {combinedScore > 0 && gap > 0 ? (
            <span className="sat-combined-score__gap">{gap} points to 1300 target</span>
          ) : combinedScore >= 1300 ? (
            <span className="sat-combined-score__hit">Target 1300+ reached</span>
          ) : null}
        </div>
        {combinedScore > 0 ? (
          <div className="sat-combined-score__bar">
            <div className="sat-combined-score__bar-track">
              <div
                className={`sat-combined-score__bar-fill sat-combined-score__bar-fill--${combinedScoreTone(combinedScore)}`}
                style={{ width: `${Math.min(100, Math.round((combinedScore / 1600) * 100))}%` }}
              />
              <div className="sat-combined-score__bar-target" style={{ left: `${Math.round((1300 / 1600) * 100)}%` }} />
            </div>
            <div className="sat-combined-score__bar-labels">
              <span>400</span>
              <span>1300 target</span>
              <span>1600</span>
            </div>
          </div>
        ) : null}
      </div>

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

      {mathWeakSkills.length ? (
        <div className="sat-table-wrap" style={{ marginTop: 18 }}>
          <h3>Math Weak Skills</h3>
          <table className="sat-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Mastery</th>
                <th>Confidence</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {mathWeakSkills.map((row) => (
                <tr key={row.skill}>
                  <td>{row.skill}</td>
                  <td>{Number(row.mastery_score || 0).toFixed(1)}</td>
                  <td>{Number(row.confidence || 0).toFixed(1)}</td>
                  <td>{row.total_attempts || 0}</td>
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

      <SessionHistory />
    </section>
  );
}

function SessionHistory() {
  const [expandedId, setExpandedId] = useState(null);
  const history = useMemo(() => {
    try {
      const raw = window.localStorage.getItem('satprep.sessionHistory.v1');
      return raw ? JSON.parse(raw).reverse().slice(0, 20) : [];
    } catch {
      return [];
    }
  }, []);

  if (!history.length) return null;

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="sat-table-wrap" style={{ marginTop: 18 }}>
      <h3>Session History</h3>
      <table className="sat-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th>Score</th>
            <th>Accuracy</th>
            <th>Pace</th>
            <th>Missed</th>
          </tr>
        </thead>
        <tbody>
          {history.map((session) => (
            <React.Fragment key={session.id}>
              <tr
                style={{ cursor: session.missedQuestions?.length ? 'pointer' : 'default' }}
                onClick={() => session.missedQuestions?.length && setExpandedId(expandedId === session.id ? null : session.id)}
              >
                <td>{formatDate(session.date)}</td>
                <td>{session.mode}</td>
                <td>{session.correctCount}/{session.totalCount}</td>
                <td>{session.accuracyPct}%</td>
                <td>{session.avgSeconds}s</td>
                <td style={{ color: session.missedQuestions?.length ? 'var(--sat-danger)' : 'var(--sat-success)' }}>
                  {session.missedQuestions?.length || 0}
                  {session.missedQuestions?.length ? ' (click)' : ''}
                </td>
              </tr>
              {expandedId === session.id && session.missedQuestions?.length ? (
                <tr>
                  <td colSpan="6" style={{ padding: 0 }}>
                    <div style={{ padding: '10px 12px', background: 'rgba(180, 35, 24, 0.04)' }}>
                      <strong>Missed Questions:</strong>
                      {session.missedQuestions.map((q, i) => (
                        <div key={q.id || i} className="sat-journal__entry" style={{ marginTop: 6 }}>
                          <div className="sat-journal__entry-header">
                            <span className="sat-pill sat-pill--neutral">{q.skill}</span>
                            <span className="sat-muted">Diff {q.difficulty} | {q.secondsSpent}s</span>
                          </div>
                          <p style={{ margin: '4px 0', fontSize: 14 }}>{q.stem}</p>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

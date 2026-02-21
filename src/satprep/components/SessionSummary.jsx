import React from 'react';

function formatSkill(skill) {
  return String(skill || '').replace(/-/g, ' ');
}

export default function SessionSummary({ summary, onDismiss }) {
  if (!summary) return null;

  const {
    correctCount = 0,
    totalCount = 0,
    attemptedCount = 0,
    accuracyPct = 0,
    avgSeconds = 0,
    elapsedSeconds = 0,
    mode = '',
    skillBreakdown = {},
    domainBreakdown = {},
  } = summary;

  const skillEntries = Object.entries(skillBreakdown)
    .map(([skill, data]) => ({
      skill,
      accuracy: data.attempts ? Math.round((data.correct / data.attempts) * 100) : 0,
      correct: data.correct,
      attempts: data.attempts,
      avgSec: data.attempts ? Math.round(data.seconds / data.attempts) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const domainEntries = Object.entries(domainBreakdown)
    .map(([domain, data]) => ({
      domain,
      accuracy: data.attempts ? Math.round((data.correct / data.attempts) * 100) : 0,
      correct: data.correct,
      attempts: data.attempts,
    }));

  const weakSkills = skillEntries.filter((s) => s.accuracy < 70).slice(0, 3);
  const strongSkills = skillEntries.filter((s) => s.accuracy >= 80).slice(-3).reverse();

  const elapsedMin = Math.round(elapsedSeconds / 60);
  const isVerbal = mode === 'verbal' || mode === 'verbal-reading' || mode === 'verbal-writing';
  const paceTarget = isVerbal ? 85 : 95;
  const isOnPace = avgSeconds <= paceTarget;

  return (
    <div className="sat-session-summary">
      <h3>Session Complete</h3>

      <div className="sat-stats-grid" style={{ marginBottom: 14 }}>
        <article className={`sat-stat ${accuracyPct >= 75 ? 'sat-stat--primary' : ''}`}>
          <div className="sat-stat__label">Score</div>
          <div className="sat-stat__value">{correctCount}/{totalCount}</div>
          <div className="sat-stat__detail">{accuracyPct}% accuracy</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Pace</div>
          <div className="sat-stat__value">{avgSeconds}s</div>
          <div className="sat-stat__detail">{isOnPace ? 'On target' : `Above ${paceTarget}s target`}</div>
        </article>
        <article className="sat-stat">
          <div className="sat-stat__label">Time</div>
          <div className="sat-stat__value">{elapsedMin} min</div>
          <div className="sat-stat__detail">{attemptedCount} attempted</div>
        </article>
      </div>

      {weakSkills.length ? (
        <div className="sat-session-summary__section">
          <h4>Priority: Work On These Skills</h4>
          <div className="sat-session-summary__skills">
            {weakSkills.map((s) => (
              <div key={s.skill} className="sat-session-summary__skill sat-session-summary__skill--weak">
                <strong>{formatSkill(s.skill)}</strong>
                <span>{s.correct}/{s.attempts} correct ({s.accuracy}%) — avg {s.avgSec}s</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {strongSkills.length ? (
        <div className="sat-session-summary__section">
          <h4>Strong Performance</h4>
          <div className="sat-session-summary__skills">
            {strongSkills.map((s) => (
              <div key={s.skill} className="sat-session-summary__skill sat-session-summary__skill--strong">
                <strong>{formatSkill(s.skill)}</strong>
                <span>{s.correct}/{s.attempts} correct ({s.accuracy}%)</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {domainEntries.length ? (
        <div className="sat-table-wrap" style={{ marginTop: 12 }}>
          <h4>Domain Breakdown</h4>
          <table className="sat-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Accuracy</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {domainEntries.map((d) => (
                <tr key={d.domain}>
                  <td>{d.domain}</td>
                  <td>{d.accuracy}%</td>
                  <td>{d.correct}/{d.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {skillEntries.length > 3 ? (
        <div className="sat-table-wrap" style={{ marginTop: 12 }}>
          <h4>All Skills</h4>
          <table className="sat-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Accuracy</th>
                <th>Score</th>
                <th>Pace</th>
              </tr>
            </thead>
            <tbody>
              {skillEntries.map((s) => (
                <tr key={s.skill}>
                  <td>{formatSkill(s.skill)}</td>
                  <td style={{ color: s.accuracy < 60 ? 'var(--sat-danger)' : s.accuracy >= 80 ? 'var(--sat-success)' : undefined }}>
                    {s.accuracy}%
                  </td>
                  <td>{s.correct}/{s.attempts}</td>
                  <td>{s.avgSec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {onDismiss ? (
        <button type="button" className="sat-btn sat-btn--primary" onClick={onDismiss} style={{ marginTop: 14 }}>
          Done
        </button>
      ) : null}
    </div>
  );
}

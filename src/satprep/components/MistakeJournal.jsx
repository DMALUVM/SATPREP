import React, { useMemo, useState } from 'react';

const HISTORY_KEY = 'satprep.sessionHistory.v1';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatSkill(skill) {
  return String(skill || 'general').replace(/-/g, ' ');
}

export default function MistakeJournal() {
  const [expanded, setExpanded] = useState(false);

  const { todayMistakes, recentMistakes, skillCounts } = useMemo(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      const todayKey = new Date().toISOString().slice(0, 10);
      const all = [];

      history.forEach((session) => {
        (session.missedQuestions || []).forEach((q) => {
          all.push({
            id: `${session.id}-${q.id}`,
            date: session.date,
            skill: q.skill || 'general',
            stem: q.stem || '',
            studentAnswer: q.studentAnswer,
            correctAnswer: q.correctAnswer,
            secondsSpent: q.secondsSpent || 0,
            domain: q.domain || '',
            difficulty: q.difficulty,
          });
        });
      });

      const today = all.filter((m) => m.date?.slice(0, 10) === todayKey);
      const recent = all.slice(-20).reverse();

      const counts = {};
      all.forEach((m) => {
        counts[m.skill] = (counts[m.skill] || 0) + 1;
      });

      return { todayMistakes: today, recentMistakes: recent, skillCounts: counts };
    } catch {
      return { todayMistakes: [], recentMistakes: [], skillCounts: {} };
    }
  }, []);

  const totalMistakes = recentMistakes.length;
  const sortedSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (totalMistakes === 0) return null;

  return (
    <div className="sat-journal">
      <button
        type="button"
        className="sat-journal__header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <h3>Mistake Tracker</h3>
        <span className="sat-journal__count">
          {todayMistakes.length} today / {totalMistakes} tracked
        </span>
        <span className="sat-btn sat-btn--ghost" style={{ padding: '4px 10px', fontSize: 13 }} aria-hidden="true">
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {!expanded && todayMistakes.length > 0 ? (
        <p className="sat-muted" style={{ margin: '8px 0 0' }}>
          {todayMistakes.length} missed question{todayMistakes.length !== 1 ? 's' : ''} auto-logged today.
          {sortedSkills.length > 0
            ? ` Most missed skill: ${formatSkill(sortedSkills[0][0])} (${sortedSkills[0][1]}x).`
            : ''}
        </p>
      ) : null}

      {expanded ? (
        <>
          {sortedSkills.length > 0 ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {sortedSkills.map(([skill, count]) => (
                <span key={skill} className="sat-pill sat-pill--neutral">
                  {formatSkill(skill)} ({count})
                </span>
              ))}
            </div>
          ) : null}

          {todayMistakes.length > 0 ? (
            <div className="sat-journal__section">
              <h4>Today ({todayMistakes.length})</h4>
              {todayMistakes.map((m) => (
                <div key={m.id} className="sat-journal__entry">
                  <div className="sat-journal__entry-header">
                    <span className="sat-pill sat-pill--neutral">{formatSkill(m.skill)}</span>
                    {m.difficulty ? <span className="sat-muted">Diff {m.difficulty}</span> : null}
                    <span className="sat-muted">{m.secondsSpent}s</span>
                  </div>
                  {m.stem ? <p style={{ fontSize: 13, margin: '4px 0 0' }}>{m.stem}</p> : null}
                  {m.studentAnswer != null ? (
                    <p style={{ fontSize: 12, color: 'var(--sat-danger)', margin: '2px 0 0' }}>
                      Answered: {m.studentAnswer} | Correct: {m.correctAnswer}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--sat-danger)', margin: '2px 0 0' }}>
                      Unanswered | Correct: {m.correctAnswer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {recentMistakes.length > todayMistakes.length ? (
            <div className="sat-journal__section">
              <h4>Recent History</h4>
              {recentMistakes
                .filter((m) => m.date?.slice(0, 10) !== new Date().toISOString().slice(0, 10))
                .slice(0, 10)
                .map((m) => (
                  <div key={m.id} className="sat-journal__entry">
                    <div className="sat-journal__entry-header">
                      <span className="sat-pill sat-pill--neutral">{formatSkill(m.skill)}</span>
                      <span className="sat-muted">{formatDate(m.date)}</span>
                    </div>
                    {m.stem ? <p style={{ fontSize: 13, margin: '4px 0 0' }}>{m.stem}</p> : null}
                  </div>
                ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

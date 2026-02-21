import React, { useMemo, useState } from 'react';
import SessionRunner from '../components/SessionRunner';
import SessionSummary from '../components/SessionSummary';
import { buildReviewSet } from '../lib/selection';
import { estimateSessionFromConfig } from '../lib/sessionTime';
import { toDateKey } from '../lib/time';

export default function ReviewPage({ progressMetrics, onRefreshProgress }) {
  const [questions, setQuestions] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const weakSkills = progressMetrics?.weak_skills || [];
  const estimate = useMemo(
    () => estimateSessionFromConfig({ count: 15, difficulty: 'medium', section: 'math' }),
    []
  );

  const recommendation = useMemo(() => {
    if (!weakSkills.length) return 'No mastery data yet. Run diagnostic and practice first.';
    return `Priority skills: ${weakSkills.slice(0, 3).map((s) => s.skill).join(', ')}`;
  }, [weakSkills]);

  if (questions) {
    return (
      <SessionRunner
        title="Targeted Weakness Review"
        mode="review"
        questions={questions}
        planDate={toDateKey()}
        onExit={() => setQuestions(null)}
        onFinish={(result) => {
          setQuestions(null);
          setSessionSummary(result);
          onRefreshProgress?.();
        }}
      />
    );
  }

  return (
    <section className="sat-panel">
      <h2>Review Loop</h2>
      <p>{recommendation}</p>
      <p>
        Estimated session time: <strong>{estimate.label}</strong>
      </p>
      <button
        type="button"
        className="sat-btn sat-btn--primary"
        onClick={() => setQuestions(buildReviewSet(progressMetrics, 15))}
        style={{ marginTop: 12 }}
      >
        Start Review Session (15)
      </button>

      {sessionSummary ? (
        <SessionSummary summary={sessionSummary} onDismiss={() => setSessionSummary(null)} />
      ) : null}

      {weakSkills.length ? (
        <div className="sat-table-wrap" style={{ marginTop: 16 }}>
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
              {weakSkills.map((skill) => (
                <tr key={skill.skill}>
                  <td>{skill.skill}</td>
                  <td>{Number(skill.mastery_score || 0).toFixed(1)}</td>
                  <td>{Number(skill.confidence || 0).toFixed(1)}</td>
                  <td>{skill.total_attempts || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

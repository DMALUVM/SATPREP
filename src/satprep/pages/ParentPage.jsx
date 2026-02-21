import React, { useState } from 'react';
import { exportWeeklyReport, fetchParentReport } from '../lib/apiClient';

export default function ParentPage({ profile }) {
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadReport() {
    setBusy(true);
    setError('');
    try {
      const data = await fetchParentReport({
        student_id: profile?.linked_student_id || undefined,
      });
      setReport(data.report);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err.message || 'Unable to load parent report');
    } finally {
      setBusy(false);
    }
  }

  async function downloadMarkdown() {
    setBusy(true);
    setError('');
    try {
      const data = await exportWeeklyReport({
        student_id: profile?.linked_student_id || undefined,
        week_start: report?.week_start,
      });
      setMarkdown(data.markdown);
    } catch (err) {
      setError(err.message || 'Unable to export report');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sat-panel">
      <h2>Parent Dashboard</h2>
      <p>
        Linked student: <code>{profile?.linked_student_id || 'not linked yet'}</code>
      </p>

      <div className="sat-actions-row">
        <button type="button" className="sat-btn sat-btn--primary" onClick={loadReport} disabled={busy}>
          {busy ? 'Loading…' : 'Load Weekly Report'}
        </button>
        {report ? (
          <button type="button" className="sat-btn" onClick={downloadMarkdown} disabled={busy}>
            Export Markdown
          </button>
        ) : null}
      </div>

      {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}

      {report ? (
        <div className="sat-grid-2" style={{ marginTop: 16 }}>
          <article className="sat-task-card">
            <h3>Highlights</h3>
            <ul className="sat-list">
              {(report.highlights || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="sat-task-card">
            <h3>Risk Alerts</h3>
            <ul className="sat-list">
              {(report.risks || []).length ? (report.risks || []).map((item) => <li key={item}>{item}</li>) : <li>No critical alerts</li>}
            </ul>
          </article>
          <article className="sat-task-card">
            <h3>Actions</h3>
            <ul className="sat-list">
              {(report.recommended_actions || []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="sat-task-card">
            <h3>Score Trend</h3>
            <p>Predicted math: {report.score_trend?.predicted_math_score}</p>
            <p>Predicted verbal: {report.score_trend?.predicted_verbal_score || 0}</p>
            <p>Weekly math accuracy: {report.score_trend?.weekly_accuracy}%</p>
            <p>Math pace: {report.score_trend?.pace_seconds}s</p>
            <p>Week start: {report.week_start}</p>
          </article>
        </div>
      ) : null}

      {metrics ? (
        <div className="sat-table-wrap" style={{ marginTop: 16 }}>
          <h3>Recent Timed Sessions</h3>
          <table className="sat-table">
            <thead>
              <tr>
                <th>Completed</th>
                <th>Accuracy</th>
                <th>Pace</th>
              </tr>
            </thead>
            <tbody>
              {(metrics.recent_timed || []).map((session) => (
                <tr key={session.id}>
                  <td>{new Date(session.completed_at).toLocaleDateString()}</td>
                  <td>{session.accuracy_pct}%</td>
                  <td>{session.avg_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {markdown ? (
        <div className="sat-panel" style={{ marginTop: 16 }}>
          <h3>Markdown Export</h3>
          <pre className="sat-markdown">{markdown}</pre>
        </div>
      ) : null}
    </section>
  );
}

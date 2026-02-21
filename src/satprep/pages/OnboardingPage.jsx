import React, { useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseBrowser';

const WEEK_PLAN = [
  ['Week 1 (Foundation)', 'Diagnostic, core algebra cleanup, error pattern detection.'],
  ['Week 2 (Acceleration)', 'Weak-skill drills + medium/hard progression and pacing discipline.'],
  ['Week 3 (Pressure)', 'More timed mixed sets, faster decisions, fewer stalls.'],
  ['Week 4 (Peak)', 'Simulation + targeted cleanup + confidence execution.'],
];

const DAILY_SEQUENCE = [
  ['Warm-up (8-10 min)', 'Rework yesterday’s misses and explain each fix out loud.'],
  ['Adaptive Drill (20 min)', 'Attack the weakest two skills first while fresh.'],
  ['Timed Block (15-20 min)', 'Work under clock pressure. Do not stall on one problem.'],
  ['Review Lock (8-10 min)', 'Write two mistake patterns and two rules for tomorrow.'],
];

const DECISION_RULES = [
  'If accuracy < 60% on a skill, run that skill in practice mode next day.',
  'If timing is slow (>95s math or >85s verbal), do a shorter timed set and focus pace.',
  'If two misses share same mistake type, review lesson pattern before new questions.',
  'If energy is low, do 30 focused minutes minimum instead of skipping.',
];

const MISTAKE_PROTOCOL = [
  'Name the miss type: concept gap, setup error, or time panic.',
  'Redo the same problem correctly without timer.',
  'Redo one similar problem with timer.',
  'Write one prevention rule in plain language.',
];

const SYMBOL_GUIDE = [
  ['sine / cosine / tangent', 'Trig ratios in right triangles.'],
  ['a/b', 'Fraction format ("a over b").'],
  ['square root of (...)', 'Value that multiplied by itself gives the inside number.'],
  ['^2', 'Squared (multiply the number by itself).'],
];

const DIAGNOSTIC_PLAYBOOK = [
  'Run diagnostic on Day 1 with full effort and no outside help.',
  'Treat it like real SAT pacing: move if stuck beyond ~95 seconds.',
  'Do not retry questions during diagnostic; first response is the signal.',
  'After finishing, start Daily Mission immediately so weak-skill targeting begins.',
];

const DESMOS_PLAYBOOK = [
  'Use Desmos when setup is clear and you need fast, accurate computation.',
  'Use graph intersections for systems and equation-solving questions.',
  'Use function input mode (for example f(3)) for function-evaluation problems.',
  'For trig/geometry with angles, confirm degree mode first.',
  'Use Desmos to reduce arithmetic mistakes, not to skip the setup step.',
];

const WHEN_NOT_TO_USE_DESMOS = [
  'Do not start with Desmos if you have not translated the problem into math yet.',
  'Do not over-graph simple arithmetic that is faster by direct calculation.',
  'Do not trust an output unless it answers the exact thing the question asks.',
];

export default function OnboardingPage({ profile, onComplete, navigate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(
    Number(profile?.settings?.daily_target_minutes || 55)
  );
  const [daysPerWeek, setDaysPerWeek] = useState(
    Number(profile?.settings?.days_per_week_goal || 6)
  );

  const estWeeklyMinutes = useMemo(
    () => Math.max(1, targetMinutes) * Math.max(1, daysPerWeek),
    [targetMinutes, daysPerWeek]
  );

  async function markReady() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const supabase = getSupabaseBrowserClient();
      const settings = {
        ...(profile?.settings || {}),
        daily_target_minutes: Math.max(30, Math.min(120, Number(targetMinutes) || 55)),
        days_per_week_goal: Math.max(4, Math.min(7, Number(daysPerWeek) || 6)),
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('sat_profiles')
        .update({
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      setNotice('Onboarding complete. Your training plan is now active.');
      onComplete?.(data);
      navigate?.('/daily');
    } catch (err) {
      setError(err.message || 'Unable to save onboarding settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sat-panel">
      <h2>Start Here: How To Use This Prep System</h2>
      <p>
        Follow this exact workflow every day. Do not guess at what to do next. The app decides your focus
        based on weak skills and timing data.
      </p>

      <div className="sat-grid-2" style={{ marginTop: 14 }}>
        <article className="sat-task-card">
          <h3>4-Week Roadmap</h3>
          <ol className="sat-list">
            {WEEK_PLAN.map(([label, desc]) => (
              <li key={label}><strong>{label}:</strong> {desc}</li>
            ))}
          </ol>
        </article>
        <article className="sat-task-card">
          <h3>Daily Mission Order</h3>
          <ol className="sat-list">
            {DAILY_SEQUENCE.map(([label, desc]) => (
              <li key={label}><strong>{label}:</strong> {desc}</li>
            ))}
          </ol>
        </article>
      </div>

      <div className="sat-grid-2" style={{ marginTop: 12 }}>
        <article className="sat-task-card">
          <h3>When To Use Each Mode</h3>
          <ul className="sat-list">
            <li><strong>Diagnostic:</strong> baseline and recalibration.</li>
            <li><strong>Practice:</strong> isolate weak skills and fix process errors.</li>
            <li><strong>Timed:</strong> pacing and pressure control.</li>
            <li><strong>Review:</strong> reinforce misses on +1/+3/+7 schedule.</li>
            <li><strong>Verbal:</strong> daily 15-20 min add-on for 700+ target.</li>
          </ul>
        </article>
        <article className="sat-task-card">
          <h3>Decision Rules</h3>
          <ul className="sat-list">
            {DECISION_RULES.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </article>
      </div>

      <div className="sat-grid-2" style={{ marginTop: 12 }}>
        <article className="sat-task-card">
          <h3>Mistake Recovery Protocol</h3>
          <ol className="sat-list">
            {MISTAKE_PROTOCOL.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article className="sat-task-card">
          <h3>Diagnostic Playbook</h3>
          <ol className="sat-list">
            {DIAGNOSTIC_PLAYBOOK.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
      </div>

      <div className="sat-grid-2" style={{ marginTop: 12 }}>
        <article className="sat-task-card">
          <h3>Symbol Guide (Plain Format)</h3>
          <ul className="sat-list">
            {SYMBOL_GUIDE.map(([symbol, meaning]) => (
              <li key={symbol}><strong>{symbol}:</strong> {meaning}</li>
            ))}
          </ul>
          <p className="sat-muted">Questions are displayed in student-friendly notation.</p>
        </article>
        <article className="sat-task-card">
          <h3>Desmos Playbook</h3>
          <ol className="sat-list">
            {DESMOS_PLAYBOOK.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <h3 style={{ marginTop: 10 }}>When Not To Use It</h3>
          <ul className="sat-list">
            {WHEN_NOT_TO_USE_DESMOS.map((step) => <li key={step}>{step}</li>)}
          </ul>
          <p className="sat-muted">Question review now includes a specific Desmos Method when applicable.</p>
        </article>
      </div>

      <div className="sat-grid-form" style={{ marginTop: 14 }}>
        <label>
          Daily target minutes
          <select value={targetMinutes} onChange={(event) => setTargetMinutes(Number(event.target.value))}>
            <option value={45}>45</option>
            <option value={55}>55</option>
            <option value={65}>65</option>
            <option value={75}>75</option>
          </select>
        </label>
        <label>
          Days/week goal
          <select value={daysPerWeek} onChange={(event) => setDaysPerWeek(Number(event.target.value))}>
            <option value={5}>5</option>
            <option value={6}>6</option>
            <option value={7}>7</option>
          </select>
        </label>
        <label>
          Weekly minutes
          <input value={`${estWeeklyMinutes} min/week`} readOnly disabled />
        </label>
        <label>
          Pacing targets
          <input value="Math <=95s, Verbal <=85s" readOnly disabled />
        </label>
      </div>

      <div className="sat-actions-row" style={{ marginTop: 8 }}>
        <button type="button" className="sat-btn sat-btn--primary" onClick={markReady} disabled={busy}>
          {busy ? 'Saving…' : 'I Understand The Plan, Start Training'}
        </button>
        <button type="button" className="sat-btn sat-btn--ghost" onClick={() => navigate?.('/daily')} disabled={busy}>
          Skip For Now
        </button>
      </div>

      {notice ? <div className="sat-alert sat-alert--success">{notice}</div> : null}
      {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}
    </section>
  );
}

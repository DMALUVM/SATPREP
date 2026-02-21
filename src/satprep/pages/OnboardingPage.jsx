import React, { useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseBrowser';
import { SAT_PLAN_PHASES, SAT_PLAN_TOTAL_DAYS, SAT_TEST_DATE, diffDays, friendlyDate, setPlanDates, toDateKey } from '../lib/time';

const DAILY_SEQUENCE = [
  ['Warm-up (8-10 min)', 'Rework yesterday\'s misses and explain each fix out loud.'],
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
  ['sin / cos / tan', 'Trig ratios — same notation the SAT uses.'],
  ['Fractions', 'Rendered with a horizontal bar, just like the real test.'],
  ['Square roots', 'Rendered with a proper radical symbol, same as test day.'],
  ['Exponents', 'Superscript notation matching the Bluebook display.'],
  ['\u03C0 and \u03B8', 'Pi (3.14159...) and theta (angle measure).'],
  ['\u2264 \u2265 \u2260', 'Less than or equal, greater than or equal, not equal.'],
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

const COACHING_FLOW = [
  'After each question, read your mistake type badge: Concept, Setup, Time, or Pace.',
  'Use Socratic Tutor Mode: answer coach questions before opening the full solution.',
  'Apply the "What To Do Next" action immediately on a similar question.',
  'Do not move on until the correction pattern is clear and repeatable.',
];

const OFFLINE_PLAYBOOK = [
  'Open SAT Prep while online at least once on the Chromebook to cache the app.',
  'When offline, keep training normally. Attempts/sessions are stored locally.',
  'Reconnect and keep the tab open for 1-2 minutes so cloud sync finishes.',
  'If you see "queued updates," do not log out until the queue returns to 0.',
];

export default function OnboardingPage({ profile, onComplete, navigate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [testDate, setTestDate] = useState(
    profile?.sat_test_date || profile?.settings?.sat_test_date || SAT_TEST_DATE || '2026-03-11'
  );
  const [targetMinutes, setTargetMinutes] = useState(
    Number(profile?.settings?.daily_target_minutes || 55)
  );
  const [daysPerWeek, setDaysPerWeek] = useState(
    Number(profile?.settings?.days_per_week_goal || 6)
  );

  const planInfo = useMemo(() => {
    const startDate = profile?.sat_start_date || toDateKey();
    const days = Math.max(1, diffDays(startDate, testDate));
    // Temporarily compute phases for this test date to show in onboarding
    setPlanDates(startDate, testDate);
    return { totalDays: days, phases: [...SAT_PLAN_PHASES], testDateFriendly: friendlyDate(testDate) };
  }, [testDate, profile?.sat_start_date]);

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
        sat_test_date: testDate,
        daily_target_minutes: Math.max(30, Math.min(120, Number(targetMinutes) || 55)),
        days_per_week_goal: Math.max(4, Math.min(7, Number(daysPerWeek) || 6)),
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('sat_profiles')
        .update({
          settings,
          sat_test_date: testDate,
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

      <div className="sat-alert" style={{ marginTop: 14 }}>
        <strong>Test date:</strong> {planInfo.testDateFriendly} {'\u2022'} <strong>{planInfo.totalDays} days</strong> of prep {'\u2022'} {planInfo.phases.length} phase{planInfo.phases.length !== 1 ? 's' : ''}
      </div>

      <div className="sat-grid-2" style={{ marginTop: 14 }}>
        <article className="sat-task-card">
          <h3>Your {planInfo.totalDays}-Day Roadmap</h3>
          <ol className="sat-list">
            {planInfo.phases.map((phase) => (
              <li key={phase.name}><strong>{phase.name} (Days {phase.startDay}-{phase.endDay}):</strong> {phase.focus}</li>
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
          <p className="sat-muted">Math renders with proper typesetting, matching the test-day Bluebook display.</p>
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

      <div className="sat-grid-2" style={{ marginTop: 12 }}>
        <article className="sat-task-card">
          <h3>How The Coach Works</h3>
          <ol className="sat-list">
            {COACHING_FLOW.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article className="sat-task-card">
          <h3>Offline Chromebook Mode</h3>
          <ol className="sat-list">
            {OFFLINE_PLAYBOOK.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
      </div>

      <div className="sat-grid-form" style={{ marginTop: 14 }}>
        <label>
          SAT Test Date
          <input
            type="date"
            value={testDate}
            onChange={(event) => setTestDate(event.target.value)}
            min={toDateKey()}
          />
        </label>
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

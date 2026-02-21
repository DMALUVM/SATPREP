import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseBrowser';

export default function ProfileSetupPage({ user, onComplete }) {
  const [role, setRole] = useState('student');
  const [displayName, setDisplayName] = useState(user?.email || '');
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [testDate, setTestDate] = useState('2026-03-11');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        user_id: user.id,
        role,
        display_name: displayName || null,
        linked_student_id: role === 'parent' && linkedStudentId ? linkedStudentId : null,
        target_total_score: 1300,
        target_math_score: 650,
        sat_start_date: new Date().toISOString().slice(0, 10),
        sat_test_date: testDate || '2026-03-11',
        settings: {
          coach_tone: 'firm-supportive',
          timing_mode: 'standard',
          daily_target_minutes: 55,
          sat_test_date: testDate || '2026-03-11',
        },
      };

      const { error: upsertError } = await supabase.from('sat_profiles').upsert(payload, {
        onConflict: 'user_id',
      });

      if (upsertError) throw upsertError;
      onComplete?.();
    } catch (err) {
      setError(err.message || 'Unable to save profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sat-auth">
      <section className="sat-auth__panel">
        <div className="sat-auth__eyebrow">Profile Setup</div>
        <h1>Set role and coaching defaults</h1>
        <form className="sat-auth__form" onSubmit={saveProfile}>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
          </label>

          <label>
            Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>

          {role === 'student' ? (
            <label>
              SAT Test Date
              <input
                type="date"
                value={testDate}
                onChange={(event) => setTestDate(event.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </label>
          ) : null}

          {role === 'parent' ? (
            <label>
              Linked student user ID
              <input
                value={linkedStudentId}
                onChange={(event) => setLinkedStudentId(event.target.value)}
                placeholder="Paste student UUID"
              />
            </label>
          ) : null}

          <button className="sat-btn sat-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save Profile'}
          </button>
          {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}
        </form>

        {role === 'parent' ? (
          <p className="sat-muted">
            Parent accounts need `linked_student_id` to view child analytics. If needed, log in as student first
            and copy the Student ID from Progress.
          </p>
        ) : null}
      </section>
    </main>
  );
}

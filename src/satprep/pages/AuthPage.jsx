import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseBrowser';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function sendMagicLink(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/sat-prep`,
        },
      });

      if (otpError) throw otpError;
      setNotice('Magic link sent. Open the email on this device and continue to SAT Prep.');
    } catch (err) {
      setError(err.message || 'Unable to send magic link');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sat-auth">
      <section className="sat-auth__panel">
        <div className="sat-auth__eyebrow">SAT Math + Verbal 1300+ Accelerator</div>
        <h1>Sign in to start the 4-week score climb</h1>
        <p>
          Student and parent each use their own email magic link account. Math + verbal sessions, attempts,
          mastery, and weekly reports sync to cloud.
        </p>
        <form onSubmit={sendMagicLink} className="sat-auth__form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@school.com"
              required
            />
          </label>
          <button type="submit" className="sat-btn sat-btn--primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send Magic Link'}
          </button>
        </form>

        {notice ? <div className="sat-alert sat-alert--success">{notice}</div> : null}
        {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}

        <ul className="sat-auth__list">
          <li>Plan start date: Sunday, February 22, 2026</li>
          <li>Daily target: 45-60 focused minutes</li>
          <li>Math target: 650-700 in four weeks</li>
          <li>Verbal target: 680-720 in four weeks</li>
          <li>Combined target: 1300+ total score</li>
        </ul>
      </section>
    </main>
  );
}

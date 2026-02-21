import React, { useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabaseBrowser';

const MODE = {
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
  MAGIC: 'magic',
};

export default function AuthPage() {
  const [mode, setMode] = useState(MODE.SIGN_IN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const actionLabel = useMemo(() => {
    if (mode === MODE.SIGN_UP) return busy ? 'Creating account…' : 'Create Account';
    if (mode === MODE.MAGIC) return busy ? 'Sending…' : 'Send Magic Link';
    return busy ? 'Signing in…' : 'Sign In';
  }, [mode, busy]);

  function clearMessages() {
    setNotice('');
    setError('');
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    clearMessages();

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === MODE.MAGIC) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/sat-prep`,
          },
        });
        if (otpError) throw otpError;
        setNotice('Magic link sent. Open the email on this device and continue to SAT Prep.');
        return;
      }

      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      if (mode === MODE.SIGN_UP) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/sat-prep`,
          },
        });
        if (signUpError) throw signUpError;

        if (data?.session) {
          setNotice('Account created and signed in. Continue to SAT Prep.');
        } else {
          setNotice('Account created. Check email to confirm account, then sign in.');
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      setNotice('Signed in. Loading SAT Prep...');
    } catch (err) {
      setError(err.message || 'Unable to complete auth action');
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    setBusy(true);
    clearMessages();
    try {
      if (!email) throw new Error('Enter email first.');
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/sat-prep`,
      });
      if (resetError) throw resetError;
      setNotice('Password reset email sent. Open it on this device to set a new password.');
    } catch (err) {
      setError(err.message || 'Unable to send password reset email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sat-auth">
      <section className="sat-auth__panel">
        <div className="sat-auth__eyebrow">SAT Math + Verbal 1300+ Accelerator</div>
        <h1>Sign in to start your SAT score climb</h1>
        <p>
          Student and parent each use their own account. Use password sign-in for daily reliability,
          keep magic link as backup.
        </p>

        <div className="sat-auth__mode" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={`sat-auth__mode-btn ${mode === MODE.SIGN_IN ? 'is-active' : ''}`}
            onClick={() => {
              setMode(MODE.SIGN_IN);
              clearMessages();
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`sat-auth__mode-btn ${mode === MODE.SIGN_UP ? 'is-active' : ''}`}
            onClick={() => {
              setMode(MODE.SIGN_UP);
              clearMessages();
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            className={`sat-auth__mode-btn ${mode === MODE.MAGIC ? 'is-active' : ''}`}
            onClick={() => {
              setMode(MODE.MAGIC);
              clearMessages();
            }}
          >
            Magic Link
          </button>
        </div>

        <form onSubmit={submitAuth} className="sat-auth__form">
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

          {mode !== MODE.MAGIC ? (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === MODE.SIGN_UP ? 'new-password' : 'current-password'}
                required
              />
            </label>
          ) : null}

          {mode === MODE.SIGN_UP ? (
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
            </label>
          ) : null}

          <button type="submit" className="sat-btn sat-btn--primary" disabled={busy}>
            {actionLabel}
          </button>

          {mode === MODE.SIGN_IN ? (
            <button type="button" className="sat-btn sat-btn--ghost" disabled={busy} onClick={sendPasswordReset}>
              Forgot Password
            </button>
          ) : null}
        </form>

        {notice ? <div className="sat-alert sat-alert--success">{notice}</div> : null}
        {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}

        <ul className="sat-auth__list">
          <li>Plan start date: Sunday, February 22, 2026</li>
          <li>Daily target: 45-60 focused minutes</li>
          <li>Math target: 650-700</li>
          <li>Verbal target: 680-720</li>
          <li>Combined target: 1300+ total score</li>
        </ul>
      </section>
    </main>
  );
}

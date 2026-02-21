import React, { useEffect, useMemo, useState } from 'react';
import NavBar from './components/NavBar';
import { useSatRoute } from './hooks/useSatRoute';
import { fetchProgress, getOfflineSyncSnapshot, subscribeOfflineSync } from './lib/apiClient';
import { getSupabaseBrowserClient } from './lib/supabaseBrowser';
import AuthPage from './pages/AuthPage';
import DailyPage from './pages/DailyPage';
import DiagnosticPage from './pages/DiagnosticPage';
import ParentPage from './pages/ParentPage';
import PracticePage from './pages/PracticePage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import ProgressPage from './pages/ProgressPage';
import ReviewPage from './pages/ReviewPage';
import TimedPage from './pages/TimedPage';
import VerbalPage from './pages/VerbalPage';
import OnboardingPage from './pages/OnboardingPage';
import './styles/satprep.css';

function NotFoundPage() {
  return (
    <section className="sat-panel">
      <h2>Page not found</h2>
      <p>Use the SAT navigation above to continue.</p>
    </section>
  );
}

export default function SatPrepApp() {
  const { route, navigate } = useSatRoute();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState('');
  const [syncState, setSyncState] = useState(() => getOfflineSyncSnapshot());

  const onboardingComplete = !!profile?.settings?.onboarding_complete;

  useEffect(() => {
    const unsubscribe = subscribeOfflineSync((snapshot) => {
      setSyncState(snapshot);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoading(false);
    }

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession || null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProgress(null);
      return;
    }

    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function loadProfile() {
      const { data, error: profileError } = await supabase
        .from('sat_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (profileError) {
        setError(profileError.message);
        setProfile(null);
        return;
      }
      setProfile(data || null);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session]);

  const refreshProgress = useMemo(() => async () => {
    if (!session?.user || !profile) return;
    setLoadingProgress(true);
    setError('');
    try {
      const params = {};
      if (profile.role === 'parent' && profile.linked_student_id) {
        params.student_id = profile.linked_student_id;
      }
      const data = await fetchProgress(params);
      setProgress(data);
    } catch (err) {
      setError(err.message || 'Unable to fetch progress');
    } finally {
      setLoadingProgress(false);
    }
  }, [session, profile]);

  useEffect(() => {
    if (profile) refreshProgress();
  }, [profile, refreshProgress]);

  useEffect(() => {
    if (!profile) return;
    if (route === '/') {
      if (profile.role === 'parent') {
        navigate('/parent');
        return;
      }
      navigate(onboardingComplete ? '/daily' : '/onboarding');
      return;
    }
  }, [route, navigate, profile, onboardingComplete]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setProgress(null);
    setProfile(null);
    navigate('/');
  }

  // Auto-clear errors after 8 seconds
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(timer);
  }, [error]);

  if (loading) {
    return (
      <main className="sat-auth">
        <section className="sat-auth__panel" style={{ textAlign: 'center' }}>
          <div className="sat-loader" aria-label="Loading" />
          <h1 style={{ marginTop: 16 }}>Loading SAT Prep</h1>
        </section>
      </main>
    );
  }

  if (!session?.user) {
    return <AuthPage />;
  }

  if (!profile) {
    return <ProfileSetupPage user={session.user} onComplete={() => window.location.reload()} />;
  }

  function renderPage() {
    if (route === '/daily' || route === '/') {
      return <DailyPage onRefreshProgress={refreshProgress} progressMetrics={progress?.metrics} navigate={navigate} />;
    }
    if (route === '/onboarding') {
      return (
        <OnboardingPage
          profile={profile}
          navigate={navigate}
          onComplete={(nextProfile) => {
            if (nextProfile) setProfile(nextProfile);
          }}
        />
      );
    }
    if (route === '/diagnostic') return <DiagnosticPage onRefreshProgress={refreshProgress} />;
    if (route === '/practice') {
      return <PracticePage onRefreshProgress={refreshProgress} progressMetrics={progress?.metrics} />;
    }
    if (route === '/timed') return <TimedPage onRefreshProgress={refreshProgress} />;
    if (route === '/review') return <ReviewPage progressMetrics={progress?.metrics} onRefreshProgress={refreshProgress} />;
    if (route === '/verbal') {
      return <VerbalPage progressMetrics={progress?.metrics} onRefreshProgress={refreshProgress} />;
    }
    if (route === '/progress') return <ProgressPage progress={progress} userId={session.user.id} />;
    if (route === '/parent') return <ParentPage profile={profile} />;
    return <NotFoundPage />;
  }

  return (
    <div className="sat-shell">
      <NavBar route={route} navigate={navigate} role={profile.role} onSignOut={handleSignOut} />
      <main className="sat-main">
        {!syncState.online ? (
          <div className="sat-alert sat-alert--danger">
            Offline mode active: training continues locally. Data will auto-sync when internet returns.
          </div>
        ) : null}
        {syncState.online && syncState.pending_total > 0 ? (
          <div className="sat-alert">
            Reconnected: syncing {syncState.pending_total} queued updates to cloud...
          </div>
        ) : null}
        {progress?.offline ? (
          <div className="sat-alert">
            Showing cached progress snapshot while offline.
          </div>
        ) : null}
        {loadingProgress ? (
          <div className="sat-alert" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sat-loader sat-loader--sm" aria-hidden="true" />
            Refreshing progress…
          </div>
        ) : null}
        {error ? <div className="sat-alert sat-alert--danger">{error}</div> : null}
        {renderPage()}
      </main>
    </div>
  );
}

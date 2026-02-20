// Supabase Cloud Sync for SAT Prep
// Provides cloud backup of progress so it persists across devices
//
// SETUP: Replace the URL and KEY below with your Supabase project credentials.
// Then run this SQL in Supabase SQL Editor to create the table:
//
//   create table user_progress (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid references auth.users(id) on delete cascade not null,
//     display_name text,
//     state jsonb not null default '{}',
//     updated_at timestamptz default now(),
//     unique(user_id)
//   );
//
//   alter table user_progress enable row level security;
//
//   create policy "Users can read own progress"
//     on user_progress for select
//     using (auth.uid() = user_id);
//
//   create policy "Users can insert own progress"
//     on user_progress for insert
//     with check (auth.uid() = user_id);
//
//   create policy "Users can update own progress"
//     on user_progress for update
//     using (auth.uid() = user_id);
//

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION - Replace these values
    // ========================================
    var SUPABASE_URL = 'https://gddypeqraqlfkmkfwedo.supabase.co';
    var SUPABASE_ANON_KEY = 'sb_publishable_zlAZ9OLn1nYxlanSynkH2w_vwsI3oZP';

    // ========================================
    // INITIALIZATION
    // ========================================
    var supabase = null;
    var currentUser = null;
    var syncEnabled = false;
    var saveDebounceTimer = null;

    function isConfigured() {
        return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
    }

    function initSupabase() {
        if (!isConfigured()) {
            console.log('[Sync] Supabase not configured. Using localStorage only.');
            return;
        }
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            syncEnabled = true;
            console.log('[Sync] Supabase initialized.');
            // Check for existing session
            restoreSession();
        } catch(e) {
            console.warn('[Sync] Failed to initialize Supabase:', e);
        }
    }

    async function restoreSession() {
        if (!supabase) return;
        try {
            var result = await supabase.auth.getSession();
            if (result.data && result.data.session) {
                currentUser = result.data.session.user;
                console.log('[Sync] Session restored for user:', currentUser.id);
            }
        } catch(e) {
            console.warn('[Sync] Could not restore session:', e);
        }
    }

    // ========================================
    // AUTH: Anonymous sign-in with display name
    // ========================================
    async function signInAnonymous(displayName) {
        if (!supabase) return null;
        try {
            var result = await supabase.auth.signInAnonymously();
            if (result.error) throw result.error;
            currentUser = result.data.user;
            // Store display name locally
            if (displayName) {
                localStorage.setItem('sat_prep_display_name', displayName);
            }
            console.log('[Sync] Signed in anonymously:', currentUser.id);
            return currentUser;
        } catch(e) {
            console.warn('[Sync] Anonymous sign-in failed:', e);
            return null;
        }
    }

    async function signInWithEmail(email, password) {
        if (!supabase) return null;
        try {
            // Try sign in first
            var result = await supabase.auth.signInWithPassword({ email: email, password: password });
            if (result.error && result.error.message.indexOf('Invalid login') !== -1) {
                // User doesn't exist, sign up
                result = await supabase.auth.signUp({ email: email, password: password });
            }
            if (result.error) throw result.error;
            currentUser = result.data.user;
            console.log('[Sync] Signed in with email:', currentUser.id);
            return currentUser;
        } catch(e) {
            console.warn('[Sync] Email sign-in failed:', e);
            throw e;
        }
    }

    async function signOut() {
        if (!supabase) return;
        try {
            await supabase.auth.signOut();
            currentUser = null;
            console.log('[Sync] Signed out.');
        } catch(e) {
            console.warn('[Sync] Sign-out failed:', e);
        }
    }

    // ========================================
    // SYNC: Save and load state from cloud
    // ========================================
    async function saveToCloud(stateObj) {
        if (!syncEnabled || !supabase || !currentUser) return false;
        try {
            var displayName = localStorage.getItem('sat_prep_display_name') || '';
            var result = await supabase
                .from('user_progress')
                .upsert({
                    user_id: currentUser.id,
                    display_name: displayName,
                    state: stateObj,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (result.error) throw result.error;
            console.log('[Sync] Saved to cloud.');
            return true;
        } catch(e) {
            console.warn('[Sync] Cloud save failed:', e);
            return false;
        }
    }

    async function loadFromCloud() {
        if (!syncEnabled || !supabase || !currentUser) return null;
        try {
            var result = await supabase
                .from('user_progress')
                .select('state, updated_at')
                .eq('user_id', currentUser.id)
                .single();

            if (result.error) {
                if (result.error.code === 'PGRST116') {
                    // No row found, first time user
                    return null;
                }
                throw result.error;
            }
            console.log('[Sync] Loaded from cloud. Last updated:', result.data.updated_at);
            return result.data.state;
        } catch(e) {
            console.warn('[Sync] Cloud load failed:', e);
            return null;
        }
    }

    // Debounced save - waits 2 seconds after last change before syncing
    function debouncedCloudSave(stateObj) {
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(function() {
            saveToCloud(stateObj);
        }, 2000);
    }

    // ========================================
    // PUBLIC API (used by app.js)
    // ========================================
    window.SATSync = {
        init: initSupabase,
        isConfigured: isConfigured,
        isLoggedIn: function() { return !!currentUser; },
        getUserId: function() { return currentUser ? currentUser.id : null; },
        getDisplayName: function() { return localStorage.getItem('sat_prep_display_name') || ''; },
        signInAnonymous: signInAnonymous,
        signInWithEmail: signInWithEmail,
        signOut: signOut,
        saveToCloud: debouncedCloudSave,
        loadFromCloud: loadFromCloud,
        // Force immediate save (e.g., before page unload)
        saveNow: saveToCloud
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSupabase);
    } else {
        initSupabase();
    }
})();

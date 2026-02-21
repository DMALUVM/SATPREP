import { buildAdaptivePracticeSet, buildPracticeSet } from './selection';
import { toDateKey } from './time';
import { getSatAccessToken } from './supabaseBrowser';

const STORAGE = {
  ATTEMPT_QUEUE: 'satprep.offline.attemptQueue.v1',
  SESSION_QUEUE: 'satprep.offline.sessionQueue.v1',
  PROGRESS_CACHE: 'satprep.cache.progress.v1',
  PARENT_CACHE: 'satprep.cache.parent.v1',
  DAILY_MISSION_CACHE: 'satprep.cache.dailyMission.v1',
  LAST_SYNC: 'satprep.cache.lastSyncAt.v1',
};

let syncInFlight = false;
let listenersBound = false;

function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/storage errors
  }
}

function isNetworkFailure(error) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('load failed')
    || message.includes('network request failed')
  );
}

function enqueue(key, payload) {
  const queue = readStorage(key, []);
  queue.push({
    payload,
    created_at: new Date().toISOString(),
  });
  writeStorage(key, queue);
  emitSyncState();
}

function dequeueSnapshot(key) {
  const items = readStorage(key, []);
  return Array.isArray(items) ? items : [];
}

function setQueue(key, items) {
  writeStorage(key, Array.isArray(items) ? items : []);
  emitSyncState();
}

function emitSyncState() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('satprep-sync-state', { detail: getOfflineSyncSnapshot() }));
}

function cacheDailyMission(planDate, data) {
  const cache = readStorage(STORAGE.DAILY_MISSION_CACHE, {});
  cache[planDate] = {
    saved_at: new Date().toISOString(),
    payload: data,
  };
  writeStorage(STORAGE.DAILY_MISSION_CACHE, cache);
}

function getCachedDailyMission(planDate) {
  const cache = readStorage(STORAGE.DAILY_MISSION_CACHE, {});
  return cache?.[planDate]?.payload || null;
}

function buildOfflineMission(planDate) {
  const progress = readStorage(STORAGE.PROGRESS_CACHE, null);
  const progressMetrics = progress?.metrics || null;
  const weakSkills = (progressMetrics?.weak_skills || []).map((row) => row.skill).filter(Boolean);

  const questionPool = weakSkills.length
    ? buildAdaptivePracticeSet({ progressMetrics, count: 24 })
    : buildPracticeSet({ count: 24, difficulty: 'all', domain: 'all', skill: 'all' });

  const ids = questionPool.map((q) => q.id);
  const tasks = [
    {
      type: 'warmup',
      label: 'Warmup + Error Recall',
      target_minutes: 8,
      question_ids: ids.slice(0, 4),
      guidance: 'Start with control: identify what is asked, then execute clean setup.',
    },
    {
      type: 'adaptive-drill',
      label: 'Adaptive Drill',
      target_minutes: 22,
      question_ids: ids.slice(4, 14),
      guidance: weakSkills.length
        ? `Focus your weakest skills first: ${weakSkills.slice(0, 2).join(', ')}.`
        : 'Run mixed medium difficulty with clean setup and speed control.',
    },
    {
      type: 'timed-mixed',
      label: 'Timed Mixed Block',
      target_minutes: 17,
      question_ids: ids.slice(14, 20),
      guidance: 'Work at SAT pace. If stuck past 90-95 seconds, eliminate and move.',
    },
    {
      type: 'review-loop',
      label: 'Review + Action Lock',
      target_minutes: 10,
      question_ids: ids.slice(20, 24),
      guidance: 'Classify misses: concept, setup, or time. Write the next correction action.',
    },
  ];

  return {
    mission: {
      student_id: null,
      plan_date: planDate,
      tasks,
      target_minutes: 57,
      status: 'offline-ready',
      completion_summary: {
        completed_tasks: 0,
        accuracy: 0,
        pace_seconds: 0,
      },
    },
    mission_metadata: {
      offline_generated: true,
      weakest_skill: weakSkills[0] || 'mixed-foundation',
      second_skill: weakSkills[1] || 'mixed-foundation',
      deprioritized_skills: (progressMetrics?.strong_skills || []).map((row) => row.skill).filter(Boolean).slice(0, 3),
    },
    questions: questionPool,
    totals: {
      canonical_and_variants_available: questionPool.length,
      mission_question_count: questionPool.length,
    },
    offline: true,
  };
}

async function satFetchRaw(path, options = {}, tokenOverride = null) {
  const token = tokenOverride || await getSatAccessToken();
  if (!token) throw new Error('You are not signed in.');

  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return json;
}

async function satFetch(path, options = {}) {
  await flushOfflineQueue();
  return satFetchRaw(path, options);
}

function bindOfflineListeners() {
  if (typeof window === 'undefined' || listenersBound) return;
  listenersBound = true;

  window.addEventListener('online', () => {
    flushOfflineQueue().catch(() => {
      // ignore sync errors, keep queue for retry
    });
    emitSyncState();
  });

  window.addEventListener('offline', () => {
    emitSyncState();
  });
}

export function getOfflineSyncSnapshot() {
  const pendingAttempts = dequeueSnapshot(STORAGE.ATTEMPT_QUEUE).length;
  const pendingSessions = dequeueSnapshot(STORAGE.SESSION_QUEUE).length;
  const lastSyncAt = readStorage(STORAGE.LAST_SYNC, null);

  return {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pending_attempts: pendingAttempts,
    pending_sessions: pendingSessions,
    pending_total: pendingAttempts + pendingSessions,
    last_sync_at: lastSyncAt,
  };
}

export function subscribeOfflineSync(listener) {
  if (typeof window === 'undefined') return () => {};
  bindOfflineListeners();

  const handler = () => {
    listener(getOfflineSyncSnapshot());
  };

  window.addEventListener('satprep-sync-state', handler);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);

  handler();

  return () => {
    window.removeEventListener('satprep-sync-state', handler);
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}

export async function flushOfflineQueue() {
  if (typeof window === 'undefined') return { synced_attempts: 0, synced_sessions: 0 };
  if (syncInFlight || !navigator.onLine) return { synced_attempts: 0, synced_sessions: 0 };

  syncInFlight = true;

  try {
    const token = await getSatAccessToken();
    if (!token) return { synced_attempts: 0, synced_sessions: 0 };

    const attemptQueue = dequeueSnapshot(STORAGE.ATTEMPT_QUEUE);
    const sessionQueue = dequeueSnapshot(STORAGE.SESSION_QUEUE);

    let syncedAttempts = 0;
    let syncedSessions = 0;

    const remainingAttempts = [];
    for (const item of attemptQueue) {
      try {
        await satFetchRaw('/api/satprep/submit-attempt', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        }, token);
        syncedAttempts += 1;
      } catch (error) {
        remainingAttempts.push(item);
        if (isNetworkFailure(error)) break;
      }
    }

    const remainingSessions = [];
    for (const item of sessionQueue) {
      try {
        await satFetchRaw('/api/satprep/complete-session', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        }, token);
        syncedSessions += 1;
      } catch (error) {
        remainingSessions.push(item);
        if (isNetworkFailure(error)) break;
      }
    }

    setQueue(STORAGE.ATTEMPT_QUEUE, remainingAttempts);
    setQueue(STORAGE.SESSION_QUEUE, remainingSessions);

    if (syncedAttempts || syncedSessions) {
      writeStorage(STORAGE.LAST_SYNC, new Date().toISOString());
    }

    return {
      synced_attempts: syncedAttempts,
      synced_sessions: syncedSessions,
    };
  } finally {
    syncInFlight = false;
    emitSyncState();
  }
}

bindOfflineListeners();

export async function generateDailyMission(payload = {}) {
  const planDate = payload?.plan_date || toDateKey();

  try {
    const result = await satFetch('/api/satprep/generate-daily-mission', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    cacheDailyMission(planDate, result);
    return result;
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;

    const cached = getCachedDailyMission(planDate);
    if (cached) {
      return { ...cached, offline: true, offline_source: 'cached-mission' };
    }

    const offlineMission = buildOfflineMission(planDate);
    cacheDailyMission(planDate, offlineMission);
    return offlineMission;
  }
}

export async function submitAttempt(payload) {
  try {
    return await satFetch('/api/satprep/submit-attempt', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    enqueue(STORAGE.ATTEMPT_QUEUE, payload);
    return { queued: true };
  }
}

export async function completeSession(payload) {
  try {
    return await satFetch('/api/satprep/complete-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    enqueue(STORAGE.SESSION_QUEUE, payload);
    return { queued: true };
  }
}

export async function fetchProgress(params = {}) {
  const query = new URLSearchParams(params).toString();
  const path = `/api/satprep/progress${query ? `?${query}` : ''}`;

  try {
    const result = await satFetch(path, { method: 'GET' });
    writeStorage(STORAGE.PROGRESS_CACHE, result);
    return result;
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    const cached = readStorage(STORAGE.PROGRESS_CACHE, null);
    if (cached) return { ...cached, offline: true };
    throw new Error('Offline and no cached progress yet. Connect once to sync baseline data.');
  }
}

export async function fetchParentReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  const path = `/api/satprep/parent-report${query ? `?${query}` : ''}`;

  try {
    const result = await satFetch(path, { method: 'GET' });
    const cache = readStorage(STORAGE.PARENT_CACHE, {});
    cache[query || 'self'] = result;
    writeStorage(STORAGE.PARENT_CACHE, cache);
    return result;
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    const cache = readStorage(STORAGE.PARENT_CACHE, {});
    const cached = cache[query || 'self'];
    if (cached) return { ...cached, offline: true };
    throw new Error('Offline and no cached parent report available yet.');
  }
}

export async function exportWeeklyReport(payload = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Weekly report export requires internet connection.');
  }

  return satFetch('/api/satprep/export-weekly-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

import { getSatAccessToken } from './supabaseBrowser';

async function satFetch(path, options = {}) {
  const token = await getSatAccessToken();
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
    throw new Error(json.error || `Request failed (${response.status})`);
  }
  return json;
}

export function generateDailyMission(payload = {}) {
  return satFetch('/api/satprep/generate-daily-mission', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitAttempt(payload) {
  return satFetch('/api/satprep/submit-attempt', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function completeSession(payload) {
  return satFetch('/api/satprep/complete-session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchProgress(params = {}) {
  const query = new URLSearchParams(params).toString();
  return satFetch(`/api/satprep/progress${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function fetchParentReport(params = {}) {
  const query = new URLSearchParams(params).toString();
  return satFetch(`/api/satprep/parent-report${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function exportWeeklyReport(payload = {}) {
  return satFetch('/api/satprep/export-weekly-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

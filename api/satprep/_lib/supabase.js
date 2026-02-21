import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[satprep] SUPABASE_URL missing; API handlers will fail until configured.');
}

export function getServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for SAT API handlers.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAuthClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for SAT API auth verification.');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export async function requireAuthUser(req) {
  const token = extractBearerToken(req);
  if (!token) {
    const err = new Error('Missing bearer token');
    err.status = 401;
    throw err;
  }

  const authClient = getAuthClient();
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error('Invalid or expired auth token');
    err.status = 401;
    throw err;
  }
  return data.user;
}

export async function getSatProfile(serviceClient, userId) {
  const { data, error } = await serviceClient
    .from('sat_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const err = new Error(`Unable to fetch sat profile: ${error.message}`);
    err.status = 500;
    throw err;
  }
  return data;
}

export async function ensureSatProfile(serviceClient, userId, roleHint = 'student') {
  const existing = await getSatProfile(serviceClient, userId);
  if (existing) return existing;

  const { data, error } = await serviceClient
    .from('sat_profiles')
    .insert({
      user_id: userId,
      role: roleHint,
      target_total_score: 1300,
      target_math_score: 650,
      sat_start_date: '2026-02-22',
      settings: {},
    })
    .select('*')
    .single();

  if (error) {
    const err = new Error(`Unable to create sat profile: ${error.message}`);
    err.status = 500;
    throw err;
  }

  return data;
}

export function resolveStudentId(profile, explicitStudentId = null) {
  if (!profile) return null;

  if (profile.role === 'parent') {
    const linkedStudentId = profile.linked_student_id || null;
    if (!linkedStudentId) return null;

    if (explicitStudentId && explicitStudentId !== linkedStudentId) {
      const err = new Error('Forbidden: parent may access only linked student.');
      err.status = 403;
      throw err;
    }

    return linkedStudentId;
  }

  if (explicitStudentId && explicitStudentId !== profile.user_id) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return profile.user_id;
}

export function sendError(res, error) {
  const status = error?.status || 500;
  return res.status(status).json({ error: error.message || 'Internal error' });
}

export function methodGuard(req, res, allowed) {
  if (req.method !== allowed) {
    res.setHeader('Allow', allowed);
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

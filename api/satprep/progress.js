import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  resolveStudentId,
  sendError,
} from './_lib/supabase.js';
import { computeProgressMetrics, loadQuestionPool } from './_lib/engine.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  try {
    const user = await requireAuthUser(req);
    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, req.query?.role_hint || 'student');

    const requestedStudentId = req.query?.student_id || null;
    const studentId = resolveStudentId(profile, requestedStudentId);

    if (!studentId) {
      return res.status(400).json({ error: 'No student account linked yet.' });
    }

    if (profile.role !== 'parent' && studentId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [questionPool, attemptsRes, sessionsRes, masteryRes, missionsRes] = await Promise.all([
      loadQuestionPool(service),
      service
        .from('sat_attempts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(2500),
      service
        .from('sat_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false })
        .limit(400),
      service
        .from('sat_mastery')
        .select('*')
        .eq('student_id', studentId),
      service
        .from('sat_daily_missions')
        .select('*')
        .eq('student_id', studentId)
        .order('plan_date', { ascending: false })
        .limit(120),
    ]);

    const metrics = computeProgressMetrics({
      attempts: attemptsRes.data || [],
      sessions: sessionsRes.data || [],
      mastery: masteryRes.data || [],
      questionPool,
      missions: missionsRes.data || [],
    });

    const today = new Date().toISOString().slice(0, 10);
    const missionToday = (missionsRes.data || []).find((m) => String(m.plan_date).slice(0, 10) === today) || null;

    return res.status(200).json({
      student_id: studentId,
      profile: {
        role: profile.role,
        linked_student_id: profile.linked_student_id,
        target_total_score: profile.target_total_score,
        target_math_score: profile.target_math_score,
        sat_start_date: profile.sat_start_date,
      },
      metrics,
      mission_today: missionToday,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

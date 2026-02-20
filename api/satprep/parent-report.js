import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  resolveStudentId,
  sendError,
} from './_lib/supabase.js';
import {
  buildWeeklyReport,
  computeProgressMetrics,
  deriveParentRisks,
  getWeekStartSunday,
  loadQuestionPool,
} from './_lib/engine.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  try {
    const user = await requireAuthUser(req);
    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, req.query?.role_hint || 'parent');

    if (profile.role !== 'parent' && profile.role !== 'student') {
      return res.status(403).json({ error: 'Parent reporting is unavailable for this role.' });
    }

    const studentId = resolveStudentId(profile, req.query?.student_id || null);
    if (!studentId) {
      return res.status(400).json({ error: 'No linked student account found.' });
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

    const risks = deriveParentRisks({
      missions: missionsRes.data || [],
      progressMetrics: metrics,
    });

    const weekStart = req.query?.week_start || getWeekStartSunday(new Date());
    const report = buildWeeklyReport({
      studentId,
      weekStart,
      progressMetrics: metrics,
      risks,
    });

    const { data: savedReport, error: reportError } = await service
      .from('sat_weekly_reports')
      .upsert(report, { onConflict: 'student_id,week_start' })
      .select('*')
      .single();

    if (reportError) throw new Error(`Unable to save weekly report: ${reportError.message}`);

    return res.status(200).json({
      report: savedReport,
      metrics,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

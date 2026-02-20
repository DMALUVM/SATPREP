import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  resolveStudentId,
  sendError,
} from './_lib/supabase.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const user = await requireAuthUser(req);
    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, req.body?.role_hint || 'student');
    const studentId = resolveStudentId(profile, req.body?.student_id || null);

    if (!studentId) return res.status(400).json({ error: 'Unable to resolve student account.' });
    if (profile.role !== 'parent' && studentId !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const mode = req.body?.mode || 'practice';
    const questionIds = Array.isArray(req.body?.question_ids) ? req.body.question_ids : [];
    const correctCount = Math.max(0, Number(req.body?.correct_count || 0));
    const totalCount = Math.max(0, Number(req.body?.total_count || questionIds.length));
    const avgSeconds = Number(req.body?.avg_seconds || 0);
    const accuracyPct = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const nowIso = new Date().toISOString();

    const payload = {
      student_id: studentId,
      mode,
      started_at: req.body?.started_at || nowIso,
      completed_at: req.body?.completed_at || nowIso,
      question_ids: questionIds,
      correct_count: correctCount,
      total_count: totalCount,
      accuracy_pct: Number(accuracyPct.toFixed(2)),
      avg_seconds: Number(avgSeconds.toFixed(2)),
      metadata: req.body?.metadata || {},
    };

    let session;
    if (req.body?.session_id) {
      const { data, error } = await service
        .from('sat_sessions')
        .update(payload)
        .eq('id', req.body.session_id)
        .eq('student_id', studentId)
        .select('*')
        .single();
      if (error) throw new Error(`Unable to update session: ${error.message}`);
      session = data;
    } else {
      const { data, error } = await service
        .from('sat_sessions')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw new Error(`Unable to create session: ${error.message}`);
      session = data;
    }

    const planDate = req.body?.plan_date;
    let mission = null;
    if (planDate) {
      const status = req.body?.mission_status || 'in_progress';
      const completionSummary = req.body?.completion_summary || {
        completed_tasks: Number(req.body?.completed_tasks || 0),
        accuracy: Number(accuracyPct.toFixed(1)),
        pace_seconds: Number(avgSeconds.toFixed(1)),
      };

      const { data, error } = await service
        .from('sat_daily_missions')
        .upsert(
          {
            student_id: studentId,
            plan_date: planDate,
            tasks: req.body?.tasks || [],
            target_minutes: Number(req.body?.target_minutes || 55),
            status,
            completion_summary: completionSummary,
            updated_at: nowIso,
          },
          { onConflict: 'student_id,plan_date' }
        )
        .select('*')
        .single();

      if (error) throw new Error(`Unable to update mission status: ${error.message}`);
      mission = data;
    }

    return res.status(200).json({
      session,
      mission,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  resolveStudentId,
  sendError,
} from './_lib/supabase.js';
import { buildQuestionLookup, generateDailyMission, loadQuestionPool } from './_lib/engine.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const user = await requireAuthUser(req);
    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, req.body?.role_hint || 'student');

    const studentId = resolveStudentId(profile, req.body?.student_id || null);
    if (!studentId) {
      return res.status(400).json({
        error:
          profile.role === 'parent'
            ? 'Parent account is not linked to a student profile yet.'
            : 'Unable to resolve student profile.',
      });
    }

    if (profile.role !== 'parent' && studentId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const planDate = req.body?.plan_date || new Date().toISOString().slice(0, 10);

    const [questionPool, masteryRes, attemptsRes] = await Promise.all([
      loadQuestionPool(service),
      service
        .from('sat_mastery')
        .select('*')
        .eq('student_id', studentId),
      service
        .from('sat_attempts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(150),
    ]);

    const mission = generateDailyMission({
      questionPool,
      masteryRows: masteryRes.data || [],
      recentAttempts: attemptsRes.data || [],
      planDate,
    });

    const { data: savedMission, error: missionError } = await service
      .from('sat_daily_missions')
      .upsert(
        {
          student_id: studentId,
          plan_date: mission.plan_date,
          tasks: mission.tasks,
          target_minutes: mission.target_minutes,
          status: mission.status,
          completion_summary: mission.completion_summary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,plan_date' }
      )
      .select('*')
      .single();

    if (missionError) {
      throw new Error(`Failed to persist daily mission: ${missionError.message}`);
    }

    const lookup = buildQuestionLookup(questionPool);
    const referencedIds = mission.tasks.flatMap((task) => task.question_ids || []);
    const questionPayload = referencedIds
      .map((id) => lookup.get(id))
      .filter(Boolean)
      .map((q) => ({
        id: q.id,
        canonical_id: q.canonical_id,
        domain: q.domain,
        skill: q.skill,
        difficulty: q.difficulty,
        format: q.format,
        stem: q.stem,
        choices: q.choices,
        explanation_steps: q.explanation_steps,
        strategy_tip: q.strategy_tip,
        trap_tag: q.trap_tag,
        target_seconds: q.target_seconds,
        is_variant: q.is_variant,
      }));

    return res.status(200).json({
      mission: savedMission,
      mission_metadata: mission.mission_metadata,
      questions: questionPayload,
      totals: {
        canonical_and_variants_available: questionPool.length,
        mission_question_count: questionPayload.length,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

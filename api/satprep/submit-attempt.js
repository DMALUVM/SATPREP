import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  resolveStudentId,
  sendError,
} from './_lib/supabase.js';
import { buildMasteryUpdate, buildQuestionLookup, loadQuestionPool } from './_lib/engine.js';

const ALLOWED_SESSION_MODES = new Set(['diagnostic', 'practice', 'timed', 'review']);

function normalizeGridAnswer(value) {
  return String(value ?? '').trim().replace(/\s+/g, '');
}

function gradeAttempt(question, answer) {
  if (question.format === 'multiple_choice') {
    return Number(answer) === Number(question.answer_key);
  }
  return normalizeGridAnswer(answer) === normalizeGridAnswer(question.answer_key);
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const user = await requireAuthUser(req);
    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, req.body?.role_hint || 'student');
    const studentId = resolveStudentId(profile, req.body?.student_id || null);

    if (!studentId) return res.status(400).json({ error: 'Unable to resolve student account.' });
    if (profile.role !== 'parent' && studentId !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const questionId = req.body?.question_id;
    const sessionMode = req.body?.session_mode || 'practice';
    const secondsSpent = Math.max(1, Number(req.body?.seconds_spent || 0));
    const sessionId = req.body?.session_id || null;
    const rawAnswer = req.body?.response_payload?.answer ?? null;

    if (!questionId) return res.status(400).json({ error: 'question_id is required.' });
    if (!ALLOWED_SESSION_MODES.has(sessionMode)) {
      return res.status(400).json({ error: 'Invalid session_mode.' });
    }

    const questionPool = await loadQuestionPool(service);
    const lookup = buildQuestionLookup(questionPool);
    const question = lookup.get(questionId);
    if (!question) return res.status(404).json({ error: `Question not found: ${questionId}` });

    const isCorrect = gradeAttempt(question, rawAnswer);
    const responsePayload = { answer: rawAnswer };

    const attemptInsert = {
      student_id: studentId,
      question_id: question.id,
      canonical_id: question.canonical_id || question.id,
      session_id: sessionId,
      session_mode: sessionMode,
      is_correct: isCorrect,
      response_payload: responsePayload,
      seconds_spent: secondsSpent,
    };

    const { data: insertedAttempt, error: attemptError } = await service
      .from('sat_attempts')
      .insert(attemptInsert)
      .select('*')
      .single();

    if (attemptError) throw new Error(`Unable to save attempt: ${attemptError.message}`);

    const { data: masteryRow, error: masteryFetchError } = await service
      .from('sat_mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('skill', question.skill)
      .maybeSingle();

    if (masteryFetchError) throw new Error(`Unable to fetch mastery: ${masteryFetchError.message}`);

    const update = buildMasteryUpdate(masteryRow, {
      is_correct: isCorrect,
      seconds_spent: secondsSpent,
      target_seconds: Number(question.target_seconds) || 95,
    });

    const { data: updatedMastery, error: masteryUpsertError } = await service
      .from('sat_mastery')
      .upsert(
        {
          student_id: studentId,
          skill: question.skill,
          ...update,
        },
        { onConflict: 'student_id,skill' }
      )
      .select('*')
      .single();

    if (masteryUpsertError) throw new Error(`Unable to upsert mastery: ${masteryUpsertError.message}`);

    return res.status(200).json({
      attempt: insertedAttempt,
      mastery: updatedMastery,
      question: {
        id: question.id,
        canonical_id: question.canonical_id,
        domain: question.domain,
        skill: question.skill,
        target_seconds: question.target_seconds,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

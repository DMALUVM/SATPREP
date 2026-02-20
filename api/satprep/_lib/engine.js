import { SAT_QUESTION_BANK } from '../../../src/satprep/content/questionBank.js';
import { VERBAL_QUESTION_BANK } from '../../../src/satprep/content/verbalQuestionBank.js';

const DEFAULT_START_DATE = '2026-02-22';
const MATH_DOMAINS = new Set(['algebra', 'advanced-math', 'problem-solving-data', 'geometry-trig']);

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isoDate(value) {
  if (!value) return todayDateString();
  return String(value).slice(0, 10);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function getWeekStartSunday(date = new Date()) {
  const d = startOfDay(date);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function normalizePoolQuestion(raw) {
  return {
    id: raw.id,
    canonical_id: raw.canonical_id || raw.id,
    is_variant: !!raw.is_variant,
    domain: raw.domain,
    skill: raw.skill,
    difficulty: Number(raw.difficulty) || 3,
    format: raw.format,
    module: raw.module || 'mixed',
    calculator_allowed: raw.calculator_allowed !== false,
    stem: raw.stem,
    choices: raw.choices || null,
    answer_key: raw.answer_key,
    explanation_steps: raw.explanation_steps || [],
    strategy_tip: raw.strategy_tip || '',
    trap_tag: raw.trap_tag || '',
    target_seconds: Number(raw.target_seconds) || 95,
    tags: raw.tags || [],
  };
}

export async function loadQuestionPool(serviceClient) {
  const verbalPool = VERBAL_QUESTION_BANK.map((q) => normalizePoolQuestion(q));

  const { data, error } = await serviceClient
    .from('sat_question_pool')
    .select('*')
    .limit(5000);

  if (error || !data?.length) {
    return [...SAT_QUESTION_BANK.map((q) => normalizePoolQuestion(q)), ...verbalPool];
  }

  const merged = [...data.map((row) => normalizePoolQuestion(row)), ...verbalPool];
  const byId = new Map();
  for (let i = 0; i < merged.length; i += 1) {
    byId.set(merged[i].id, merged[i]);
  }
  return [...byId.values()];
}

export function buildQuestionLookup(questionPool) {
  const map = new Map();
  for (let i = 0; i < questionPool.length; i += 1) {
    map.set(questionPool[i].id, questionPool[i]);
  }
  return map;
}

function randomPick(array, count, used = new Set()) {
  const out = [];
  for (let i = 0; i < array.length; i += 1) {
    if (out.length >= count) break;
    const q = array[i];
    if (used.has(q.id)) continue;
    used.add(q.id);
    out.push(q);
  }
  return out;
}

function weightedSortByWeakness(masteryRows) {
  const rows = (masteryRows || []).slice();
  rows.sort((a, b) => {
    const aScore = Number(a.mastery_score) || 0;
    const bScore = Number(b.mastery_score) || 0;
    if (aScore !== bScore) return aScore - bScore;
    const aAttempts = Number(a.total_attempts) || 0;
    const bAttempts = Number(b.total_attempts) || 0;
    return bAttempts - aAttempts;
  });
  return rows;
}

function findSkillFallbacks(questionPool, count = 4) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < questionPool.length; i += 1) {
    const skill = questionPool[i].skill;
    if (seen.has(skill)) continue;
    seen.add(skill);
    out.push(skill);
    if (out.length >= count) break;
  }
  return out;
}

function computeReviewQueue(recentAttempts, questionLookup) {
  const now = Date.now();
  const queue = [];
  for (let i = 0; i < recentAttempts.length; i += 1) {
    const attempt = recentAttempts[i];
    const q = questionLookup.get(attempt.question_id);
    if (!q) continue;
    const slow = Number(attempt.seconds_spent) > Number(q.target_seconds) * 1.2;
    if (!attempt.is_correct || slow) {
      queue.push({ attempt, question: q, age: now - new Date(attempt.created_at).getTime() });
    }
  }
  queue.sort((a, b) => a.age - b.age);
  return queue.map((item) => item.question);
}

function chooseQuestionSet(questionPool, opts) {
  const {
    skills = [],
    excludeSkills = [],
    count = 10,
    excludeIds = new Set(),
    allowVariants = true,
    difficultyMin = 1,
    difficultyMax = 5,
  } = opts;

  const matches = questionPool.filter((q) => {
    if (excludeIds.has(q.id)) return false;
    if (!allowVariants && q.is_variant) return false;
    if (q.difficulty < difficultyMin || q.difficulty > difficultyMax) return false;
    if (skills.length && !skills.includes(q.skill)) return false;
    if (excludeSkills.length && excludeSkills.includes(q.skill)) return false;
    return true;
  });

  return randomPick(matches, count, excludeIds);
}

function splitSkillBands(masteryRows) {
  const rows = masteryRows || [];
  const weakSkills = [];
  const growthSkills = [];
  const strongSkills = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const skill = row.skill;
    const mastery = Number(row.mastery_score) || 0;
    const attempts = Number(row.total_attempts) || 0;
    if (mastery >= 85 && attempts >= 8) {
      strongSkills.push(skill);
    } else if (mastery >= 70 && attempts >= 4) {
      growthSkills.push(skill);
    } else {
      weakSkills.push(skill);
    }
  }

  return { weakSkills, growthSkills, strongSkills };
}

export function generateDailyMission({
  questionPool,
  masteryRows = [],
  recentAttempts = [],
  planDate = todayDateString(),
}) {
  const mathPool = questionPool.filter((q) => MATH_DOMAINS.has(q.domain));
  const used = new Set();
  const lookup = buildQuestionLookup(mathPool);
  const sortedWeak = weightedSortByWeakness(masteryRows);
  const skillBands = splitSkillBands(sortedWeak);
  const fallbackSkills = findSkillFallbacks(mathPool, 6);

  const weakestSkill = skillBands.weakSkills[0] || sortedWeak[0]?.skill || fallbackSkills[0] || 'linear-equations';
  const secondSkill =
    skillBands.weakSkills[1] ||
    skillBands.growthSkills[0] ||
    sortedWeak[1]?.skill ||
    fallbackSkills[1] ||
    weakestSkill;
  const thirdSkill =
    skillBands.weakSkills[2] ||
    skillBands.growthSkills[1] ||
    fallbackSkills[2] ||
    secondSkill;
  const deprioritizedSkills = skillBands.strongSkills.slice(0, 6);

  const reviewQueue = computeReviewQueue(recentAttempts, lookup);
  const reviewQuestions = randomPick(reviewQueue, 3, used);

  const weakQuestions = chooseQuestionSet(mathPool, {
    skills: [weakestSkill, secondSkill].filter(Boolean),
    count: 8,
    excludeIds: used,
    difficultyMin: 1,
    difficultyMax: 4,
    excludeSkills: deprioritizedSkills,
  });

  const secondQuestions = chooseQuestionSet(mathPool, {
    skills: [secondSkill, thirdSkill].filter(Boolean),
    count: 5,
    excludeIds: used,
    difficultyMin: 2,
    difficultyMax: 5,
    excludeSkills: deprioritizedSkills,
  });

  const timedWeakCore = chooseQuestionSet(mathPool, {
    skills: [weakestSkill, secondSkill, thirdSkill].filter(Boolean),
    count: 3,
    excludeIds: used,
    difficultyMin: 2,
    difficultyMax: 5,
  });

  const timedMaintenance = chooseQuestionSet(mathPool, {
    skills: skillBands.growthSkills,
    count: 1,
    excludeIds: used,
    difficultyMin: 2,
    difficultyMax: 5,
  });

  const timedFallback = chooseQuestionSet(mathPool, {
    count: 4,
    excludeIds: used,
    difficultyMin: 2,
    difficultyMax: 5,
    excludeSkills: deprioritizedSkills,
  });

  const timedQuestions = [...timedWeakCore, ...timedMaintenance];
  for (let i = 0; i < timedFallback.length && timedQuestions.length < 4; i += 1) {
    timedQuestions.push(timedFallback[i]);
  }

  const remainingReview = reviewQuestions.slice(0, 3);
  const adaptiveQuestionCount = weakQuestions.length + secondQuestions.length + timedQuestions.length;

  const tasks = [
    {
      type: 'warmup',
      label: 'Error Recall Warmup',
      question_ids: remainingReview.map((q) => q.id),
      target_minutes: 9,
      guidance: 'Re-work recent misses and explain each step out loud.',
    },
    {
      type: 'adaptive-drill',
      label: 'Adaptive Weakness Drill',
      question_ids: [...weakQuestions, ...secondQuestions].map((q) => q.id),
      target_minutes: 20,
      guidance: `Primary focus: ${weakestSkill}. Secondary focus: ${secondSkill}.`,
    },
    {
      type: 'timed-mixed',
      label: 'Timed Mixed Sprint',
      question_ids: timedQuestions.map((q) => q.id),
      target_minutes: 18,
      guidance: 'Target 95 sec/question. Guess strategically and keep moving.',
    },
    {
      type: 'review-lock',
      label: 'Review + Lock-In',
      question_ids: [],
      target_minutes: 8,
      guidance: 'Write 2 mistakes and 2 rules to apply tomorrow.',
    },
  ];

  return {
    plan_date: isoDate(planDate),
    target_minutes: 55,
    status: 'pending',
    tasks,
    completion_summary: { completed_tasks: 0, accuracy: 0, pace_seconds: 0 },
    mission_metadata: {
      allocation: {
        weakest_skill_pct: 40,
        second_skill_pct: 25,
        timed_pct: 20,
        review_pct: 15,
      },
      weakest_skill: weakestSkill,
      second_skill: secondSkill,
      third_skill: thirdSkill,
      deprioritized_skills: deprioritizedSkills,
      adaptive_question_count: adaptiveQuestionCount,
      generated_at: new Date().toISOString(),
    },
  };
}

export function getReviewIntervalDays(totalAttempts, isCorrect, secondsSpent, targetSeconds) {
  const slow = Number(secondsSpent) > Number(targetSeconds) * 1.2;
  if (isCorrect && !slow) return null;
  if (totalAttempts <= 2) return 1;
  if (totalAttempts <= 6) return 3;
  return 7;
}

export function buildMasteryUpdate(existingRow, attemptInput) {
  const current = existingRow || {
    mastery_score: 50,
    confidence: 0,
    total_attempts: 0,
    correct_attempts: 0,
    avg_seconds: 0,
  };

  const totalAttempts = Number(current.total_attempts) + 1;
  const correctAttempts = Number(current.correct_attempts) + (attemptInput.is_correct ? 1 : 0);
  const prevAvg = Number(current.avg_seconds) || attemptInput.seconds_spent;
  const avgSeconds = ((prevAvg * Number(current.total_attempts || 0)) + attemptInput.seconds_spent) / totalAttempts;
  const accuracy = (correctAttempts / totalAttempts) * 100;
  const paceScore = clamp(100 - ((avgSeconds - attemptInput.target_seconds) * 1.4), 25, 100);
  const masteryScore = clamp((accuracy * 0.72) + (paceScore * 0.28), 0, 100);
  const confidence = clamp((Number(current.confidence) * 0.7) + (Math.min(100, totalAttempts * 8) * 0.3), 0, 100);

  const intervalDays = getReviewIntervalDays(totalAttempts, attemptInput.is_correct, attemptInput.seconds_spent, attemptInput.target_seconds);
  const dueAt = intervalDays ? addDays(new Date(), intervalDays).toISOString() : null;

  return {
    mastery_score: Number(masteryScore.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    total_attempts: totalAttempts,
    correct_attempts: correctAttempts,
    avg_seconds: Number(avgSeconds.toFixed(2)),
    last_seen_at: new Date().toISOString(),
    due_for_review_at: dueAt,
    updated_at: new Date().toISOString(),
  };
}

export function computeProgressMetrics({ attempts = [], sessions = [], mastery = [], questionPool = [], missions = [] }) {
  const lookup = buildQuestionLookup(questionPool);
  const totals = { correct: 0, count: attempts.length, seconds: 0 };
  const domainBreakdown = {};

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    const q = lookup.get(attempt.question_id) || lookup.get(attempt.canonical_id);
    const domain = q?.domain || 'unknown';
    if (!domainBreakdown[domain]) domainBreakdown[domain] = { correct: 0, attempts: 0, accuracy: 0 };
    domainBreakdown[domain].attempts += 1;
    if (attempt.is_correct) {
      totals.correct += 1;
      domainBreakdown[domain].correct += 1;
    }
    totals.seconds += Number(attempt.seconds_spent) || 0;
  }

  Object.keys(domainBreakdown).forEach((domain) => {
    const d = domainBreakdown[domain];
    d.accuracy = d.attempts ? Number(((d.correct / d.attempts) * 100).toFixed(1)) : 0;
  });

  const accuracy = totals.count ? (totals.correct / totals.count) * 100 : 0;
  const avgSeconds = totals.count ? totals.seconds / totals.count : 0;
  const predictedMathScore = Math.round(
    clamp(380 + accuracy * 3.4 + Math.max(0, (120 - avgSeconds) * 2.2), 200, 800)
  );

  const masterySorted = (mastery || []).slice().sort((a, b) => (Number(a.mastery_score) || 0) - (Number(b.mastery_score) || 0));
  const weakSkills = masterySorted.slice(0, 5).map((row) => ({
    skill: row.skill,
    mastery_score: Number(row.mastery_score) || 0,
    confidence: Number(row.confidence) || 0,
    total_attempts: Number(row.total_attempts) || 0,
  }));

  const missionDays = new Map();
  missions.forEach((m) => missionDays.set(isoDate(m.plan_date), m.status));
  let streak = 0;
  let cursor = startOfDay(new Date());
  while (streak < 60) {
    const key = cursor.toISOString().slice(0, 10);
    if (missionDays.get(key) !== 'complete') break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const timedSessions = sessions.filter((s) => s.mode === 'timed').sort((a, b) => {
    return new Date(a.completed_at || a.started_at).getTime() - new Date(b.completed_at || b.started_at).getTime();
  });

  const recentTimed = timedSessions.slice(-5).map((s) => ({
    id: s.id,
    accuracy_pct: Number(s.accuracy_pct) || 0,
    avg_seconds: Number(s.avg_seconds) || 0,
    completed_at: s.completed_at || s.started_at,
  }));

  return {
    totals: {
      attempts: totals.count,
      correct: totals.correct,
      accuracy_pct: Number(accuracy.toFixed(1)),
      pace_seconds: Number(avgSeconds.toFixed(1)),
      predicted_math_score: predictedMathScore,
    },
    domain_breakdown: domainBreakdown,
    weak_skills: weakSkills,
    streak_days: streak,
    recent_timed: recentTimed,
    calendar: {
      start_date: DEFAULT_START_DATE,
      week_1: ['2026-02-22', '2026-02-28'],
      week_2: ['2026-03-01', '2026-03-07'],
      week_3: ['2026-03-08', '2026-03-14'],
      week_4: ['2026-03-15', '2026-03-21'],
    },
  };
}

export function deriveParentRisks({ missions = [], progressMetrics }) {
  const risks = [];
  const today = startOfDay(new Date());
  const y1 = addDays(today, -1).toISOString().slice(0, 10);
  const y2 = addDays(today, -2).toISOString().slice(0, 10);
  const missionMap = new Map(missions.map((m) => [isoDate(m.plan_date), m.status]));

  if (missionMap.get(y1) !== 'complete' && missionMap.get(y2) !== 'complete') {
    risks.push('Missed two consecutive daily missions.');
  }

  const timed = progressMetrics.recent_timed || [];
  if (timed.length >= 3) {
    const last3 = timed.slice(-3).map((s) => s.accuracy_pct);
    if (last3[0] > last3[1] && last3[1] > last3[2]) {
      risks.push('Timed-session accuracy declined in two consecutive sessions.');
    }
  }

  const persistentWeak = (progressMetrics.weak_skills || []).find(
    (s) => s.mastery_score < 60 && s.total_attempts >= 10
  );
  if (persistentWeak) {
    risks.push(`Persistent weakness in ${persistentWeak.skill} (mastery ${persistentWeak.mastery_score.toFixed(1)}).`);
  }

  return risks;
}

export function buildWeeklyReport({ studentId, weekStart, progressMetrics, risks = [] }) {
  const highlights = [];
  const actions = [];
  const totals = progressMetrics.totals;

  highlights.push(`Predicted SAT Math score: ${totals.predicted_math_score}`);
  highlights.push(`Weekly accuracy: ${totals.accuracy_pct}%`);
  highlights.push(`Average pace: ${totals.pace_seconds} sec/question`);
  highlights.push(`Current streak: ${progressMetrics.streak_days} day(s)`);

  const weakest = progressMetrics.weak_skills.slice(0, 2);
  weakest.forEach((w) => {
    actions.push(`Spend 20 minutes/day on ${w.skill} until mastery exceeds 70.`);
  });
  actions.push('Complete at least 4 timed mixed sets this week at standard SAT pacing.');
  actions.push('Review every incorrect or slow item at +1, +3, and +7 days.');

  return {
    student_id: studentId,
    week_start: weekStart,
    highlights,
    risks,
    score_trend: {
      predicted_math_score: totals.predicted_math_score,
      weekly_accuracy: totals.accuracy_pct,
      pace_seconds: totals.pace_seconds,
    },
    domain_breakdown: progressMetrics.domain_breakdown,
    recommended_actions: actions,
    report_payload: {
      generated_at: new Date().toISOString(),
      totals,
      weak_skills: progressMetrics.weak_skills,
      recent_timed: progressMetrics.recent_timed,
    },
  };
}

export function renderWeeklyReportMarkdown(report) {
  const lines = [];
  lines.push(`# SAT Math Weekly Report`);
  lines.push(``);
  lines.push(`- Student: ${report.student_id}`);
  lines.push(`- Week start: ${report.week_start}`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## Highlights`);
  (report.highlights || []).forEach((h) => lines.push(`- ${h}`));
  lines.push(``);
  lines.push(`## Risks`);
  if (!report.risks?.length) lines.push(`- No high-severity risks detected this week.`);
  (report.risks || []).forEach((r) => lines.push(`- ${r}`));
  lines.push(``);
  lines.push(`## Domain Breakdown`);
  Object.entries(report.domain_breakdown || {}).forEach(([domain, stats]) => {
    lines.push(`- ${domain}: ${stats.accuracy}% accuracy across ${stats.attempts} attempts`);
  });
  lines.push(``);
  lines.push(`## Recommended Actions`);
  (report.recommended_actions || []).forEach((a) => lines.push(`- ${a}`));
  lines.push(``);
  return lines.join('\n');
}

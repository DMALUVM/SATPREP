import { SAT_CANONICAL_QUESTIONS, SAT_QUESTION_BANK } from '../content/questionBank';

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

export function getQuestionById(id) {
  return SAT_QUESTION_BANK.find((q) => q.id === id) || null;
}

export function buildDiagnosticSet() {
  const domains = ['algebra', 'advanced-math', 'problem-solving-data', 'geometry-trig'];
  const result = [];
  domains.forEach((domain) => {
    const pool = SAT_CANONICAL_QUESTIONS.filter((q) => q.domain === domain);
    const easy = shuffle(pool.filter((q) => q.difficulty <= 2)).slice(0, 2);
    const medium = shuffle(pool.filter((q) => q.difficulty === 3)).slice(0, 2);
    const hard = shuffle(pool.filter((q) => q.difficulty >= 4)).slice(0, 2);
    result.push(...easy, ...medium, ...hard);
  });
  return shuffle(result).slice(0, 24);
}

export function buildTimedSet(count = 44) {
  const weighted = shuffle(SAT_QUESTION_BANK).filter((q) => q.difficulty >= 2);
  return weighted.slice(0, count);
}

export function buildPracticeSet({ domain = 'all', skill = 'all', difficulty = 'all', count = 12 }) {
  let pool = SAT_QUESTION_BANK.slice();
  if (domain !== 'all') pool = pool.filter((q) => q.domain === domain);
  if (skill !== 'all') pool = pool.filter((q) => q.skill === skill);
  if (difficulty !== 'all') {
    if (difficulty === 'easy') pool = pool.filter((q) => q.difficulty <= 2);
    if (difficulty === 'medium') pool = pool.filter((q) => q.difficulty === 3);
    if (difficulty === 'hard') pool = pool.filter((q) => q.difficulty >= 4);
  }
  return shuffle(pool).slice(0, count);
}

export function buildAdaptivePracticeSet({ progressMetrics, domain = 'all', difficulty = 'all', count = 12 }) {
  const weakSkills = (progressMetrics?.weak_skills || [])
    .map((row) => row.skill)
    .filter(Boolean);

  if (!weakSkills.length) {
    return buildPracticeSet({ domain, difficulty, count, skill: 'all' });
  }

  let scopedPool = SAT_QUESTION_BANK.slice();
  if (domain !== 'all') scopedPool = scopedPool.filter((q) => q.domain === domain);
  if (difficulty !== 'all') {
    if (difficulty === 'easy') scopedPool = scopedPool.filter((q) => q.difficulty <= 2);
    if (difficulty === 'medium') scopedPool = scopedPool.filter((q) => q.difficulty === 3);
    if (difficulty === 'hard') scopedPool = scopedPool.filter((q) => q.difficulty >= 4);
  }

  const weakPool = scopedPool.filter((q) => weakSkills.includes(q.skill));
  const maintenancePool = scopedPool.filter((q) => !weakSkills.includes(q.skill));

  const weakCount = Math.min(weakPool.length, Math.max(1, Math.round(count * 0.75)));
  const maintenanceCount = Math.max(0, count - weakCount);

  return [...shuffle(weakPool).slice(0, weakCount), ...shuffle(maintenancePool).slice(0, maintenanceCount)];
}

export function buildReviewSet(progressMetrics, count = 15) {
  const weakSkills = (progressMetrics?.weak_skills || []).map((s) => s.skill).filter(Boolean);
  if (!weakSkills.length) return shuffle(SAT_QUESTION_BANK).slice(0, count);
  const pool = SAT_QUESTION_BANK.filter((q) => weakSkills.includes(q.skill));
  return shuffle(pool).slice(0, count);
}

export function listSkills(domain = 'all') {
  const source = domain === 'all'
    ? SAT_CANONICAL_QUESTIONS
    : SAT_CANONICAL_QUESTIONS.filter((q) => q.domain === domain);
  const set = new Set(source.map((q) => q.skill));
  return [...set].sort();
}

export function listDomains() {
  const set = new Set(SAT_CANONICAL_QUESTIONS.map((q) => q.domain));
  return [...set].sort();
}

import { SAT_CANONICAL_QUESTIONS, SAT_QUESTION_BANK } from '../content/questionBank';
import { getVerbalQuestionById } from '../content/verbalQuestionBank';

const SEEN_KEY = 'satprep.seenQuestions.v1';

function loadSeenIds() {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    // Keep only the last 2000 IDs to prevent unbounded growth
    if (Array.isArray(parsed)) return new Set(parsed.slice(-2000));
    return new Set();
  } catch { return new Set(); }
}

function saveSeenIds(seenSet) {
  try {
    const arr = [...seenSet].slice(-2000);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch { /* ignore quota errors */ }
}

export function markQuestionsSeen(questionIds) {
  const seen = loadSeenIds();
  questionIds.forEach((id) => seen.add(id));
  saveSeenIds(seen);
}

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

function dedup(pool, minFresh = 0) {
  const seen = loadSeenIds();
  const unseen = pool.filter((q) => !seen.has(q.id));
  // If we have enough unseen questions, use those
  if (unseen.length >= minFresh) return unseen;
  // Otherwise, prefer unseen but fill with least-recently-seen
  // (just shuffle the full pool — seen ones go to back)
  return [...unseen, ...pool.filter((q) => seen.has(q.id))];
}

export function getQuestionById(id) {
  return SAT_QUESTION_BANK.find((q) => q.id === id) || getVerbalQuestionById(id) || null;
}

export function buildDiagnosticSet() {
  const domains = ['algebra', 'advanced-math', 'problem-solving-data', 'geometry-trig'];
  const result = [];
  domains.forEach((domain) => {
    const pool = dedup(SAT_CANONICAL_QUESTIONS.filter((q) => q.domain === domain));
    const easy = shuffle(pool.filter((q) => q.difficulty <= 2)).slice(0, 2);
    const medium = shuffle(pool.filter((q) => q.difficulty === 3)).slice(0, 2);
    const hard = shuffle(pool.filter((q) => q.difficulty >= 4)).slice(0, 2);
    result.push(...easy, ...medium, ...hard);
  });
  const selected = shuffle(result).slice(0, 24);
  markQuestionsSeen(selected.map((q) => q.id));
  return selected;
}

export function buildTimedSet(count = 44) {
  const pool = dedup(SAT_QUESTION_BANK.filter((q) => q.difficulty >= 2));
  const selected = shuffle(pool).slice(0, count);
  markQuestionsSeen(selected.map((q) => q.id));
  return selected;
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
  pool = dedup(pool, count);
  const selected = shuffle(pool).slice(0, count);
  markQuestionsSeen(selected.map((q) => q.id));
  return selected;
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

  const weakPool = dedup(scopedPool.filter((q) => weakSkills.includes(q.skill)));
  const maintenancePool = dedup(scopedPool.filter((q) => !weakSkills.includes(q.skill)));

  const weakCount = Math.min(weakPool.length, Math.max(1, Math.round(count * 0.75)));
  const maintenanceCount = Math.max(0, count - weakCount);

  const selected = [...shuffle(weakPool).slice(0, weakCount), ...shuffle(maintenancePool).slice(0, maintenanceCount)];
  markQuestionsSeen(selected.map((q) => q.id));
  return selected;
}

export function buildReviewSet(progressMetrics, count = 15) {
  const weakSkills = (progressMetrics?.weak_skills || []).map((s) => s.skill).filter(Boolean);
  let pool;
  if (!weakSkills.length) pool = dedup(SAT_QUESTION_BANK);
  else pool = dedup(SAT_QUESTION_BANK.filter((q) => weakSkills.includes(q.skill)));
  const selected = shuffle(pool).slice(0, count);
  markQuestionsSeen(selected.map((q) => q.id));
  return selected;
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

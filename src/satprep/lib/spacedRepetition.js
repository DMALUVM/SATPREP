/**
 * Spaced Repetition Engine (simplified SM-2)
 *
 * When a student misses a question, it gets scheduled for review at
 * increasing intervals: day+1, day+3, day+7. Three consecutive correct
 * reviews graduate the question out of the review queue.
 *
 * All data persists in localStorage so it works offline on Chromebooks.
 */

import { toDateKey } from './time';

const STORAGE_KEY = 'satprep.spacedRepetition.v1';
const GRADUATE_THRESHOLD = 3; // correct reviews needed to graduate

function readQueue() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeQueue(queue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore quota errors
  }
}

function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/**
 * Record missed questions for spaced review scheduling.
 * Called after each session with the list of wrong/unanswered questions.
 */
export function recordMisses(missedQuestions) {
  if (!Array.isArray(missedQuestions) || !missedQuestions.length) return;
  const queue = readQueue();
  const today = toDateKey();

  missedQuestions.forEach((q) => {
    if (!q?.id) return;
    const existing = queue[q.id];

    if (existing) {
      // Already tracking — reset interval on another miss
      existing.interval_days = 1;
      existing.correct_reviews = 0;
      existing.next_review_date = addDays(today, 1);
      existing.last_missed_at = today;
    } else {
      queue[q.id] = {
        question_id: q.id,
        skill: q.skill || '',
        domain: q.domain || '',
        difficulty: q.difficulty || 0,
        stem_preview: String(q.stem || '').slice(0, 200),
        first_missed_at: today,
        last_missed_at: today,
        next_review_date: addDays(today, 1),
        interval_days: 1,
        correct_reviews: 0,
        total_reviews: 0,
      };
    }
  });

  writeQueue(queue);
}

/**
 * Record a correct review — advance the interval or graduate.
 */
export function recordCorrectReview(questionId) {
  const queue = readQueue();
  const entry = queue[questionId];
  if (!entry) return;

  entry.correct_reviews += 1;
  entry.total_reviews += 1;

  if (entry.correct_reviews >= GRADUATE_THRESHOLD) {
    // Graduate: remove from queue
    delete queue[questionId];
  } else {
    // Advance interval: 1 → 3 → 7
    const nextInterval = entry.interval_days <= 1 ? 3 : 7;
    entry.interval_days = nextInterval;
    entry.next_review_date = addDays(toDateKey(), nextInterval);
  }

  writeQueue(queue);
}

/**
 * Record a wrong review — reset to interval 1.
 */
export function recordWrongReview(questionId) {
  const queue = readQueue();
  const entry = queue[questionId];
  if (!entry) return;

  entry.correct_reviews = 0;
  entry.total_reviews += 1;
  entry.interval_days = 1;
  entry.next_review_date = addDays(toDateKey(), 1);

  writeQueue(queue);
}

/**
 * Get all question IDs due for review today (or overdue).
 */
export function getDueReviewIds(today) {
  const dateKey = today || toDateKey();
  const queue = readQueue();
  return Object.values(queue)
    .filter((entry) => entry.next_review_date <= dateKey)
    .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
    .map((entry) => entry.question_id);
}

/**
 * Get summary stats for the review queue.
 */
export function getReviewStats() {
  const queue = readQueue();
  const entries = Object.values(queue);
  const today = toDateKey();
  const dueToday = entries.filter((e) => e.next_review_date <= today).length;
  const upcoming = entries.filter((e) => e.next_review_date > today).length;

  return {
    total: entries.length,
    due_today: dueToday,
    upcoming,
  };
}

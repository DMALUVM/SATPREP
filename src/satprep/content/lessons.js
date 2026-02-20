import legacyLessonsRaw from './legacyLessons.js';

const DOMAIN_MAP = {
  algebra: 'algebra',
  'advanced-math': 'advanced-math',
  'problem-solving': 'problem-solving-data',
  geometry: 'geometry-trig',
};

function toPlainText(html) {
  return String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export const SAT_LESSONS = legacyLessonsRaw.map((lesson, index) => ({
  id: `lesson-${lesson.id || index + 1}`,
  source_id: lesson.id || null,
  domain: DOMAIN_MAP[lesson.topic] || 'algebra',
  skill: lesson.id || lesson.title || `lesson-${index + 1}`,
  title: lesson.title || `Lesson ${index + 1}`,
  description: lesson.description || 'Targeted SAT math lesson.',
  estimated_minutes: Number(lesson.estimatedMinutes) || 25,
  difficulty: Math.max(1, Math.min(5, Number(lesson.difficulty) || 2)),
  key_formulas: Array.isArray(lesson.keyFormulas) ? lesson.keyFormulas.map(String) : [],
  body_text: toPlainText(lesson.content || ''),
  source_question_ids: Array.isArray(lesson.questionIds)
    ? lesson.questionIds.map((id) => `legacy-${id}`)
    : [],
}));

export function getLessonById(lessonId) {
  return SAT_LESSONS.find((lesson) => lesson.id === lessonId) || null;
}

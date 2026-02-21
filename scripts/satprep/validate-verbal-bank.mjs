import { VERBAL_QUESTION_BANK, getVerbalStats } from '../../src/satprep/content/verbalQuestionBank.js';

const issues = [];
const ids = new Set();
const LATEX_MARKERS = [/\\frac/, /\\sqrt/, /\\sin/, /\\cos/, /\\tan/, /\$/];

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeChoice(value) {
  return normalize(value);
}

function explanationMentionsChoice(steps, choice) {
  const joined = normalize((steps || []).join(' '));
  const normalizedChoice = normalize(choice);
  return !!joined && !!normalizedChoice && joined.includes(normalizedChoice);
}

VERBAL_QUESTION_BANK.forEach((q, idx) => {
  if (!q.id) issues.push(`Missing id at index ${idx}`);
  if (ids.has(q.id)) issues.push(`Duplicate id ${q.id}`);
  ids.add(q.id);
  if (!['verbal-reading', 'verbal-writing'].includes(q.domain)) issues.push(`${q.id}: invalid domain ${q.domain}`);
  if (q.format !== 'multiple_choice') issues.push(`${q.id}: unsupported format ${q.format}`);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) issues.push(`${q.id}: choices must have length 4`);
  if (typeof q.answer_key !== 'number' || q.answer_key < 0 || q.answer_key > 3) issues.push(`${q.id}: invalid answer_key`);
  if (!Array.isArray(q.explanation_steps) || q.explanation_steps.length < 2) issues.push(`${q.id}: explanation too short`);
  if (!q.strategy_tip || String(q.strategy_tip).trim().length < 10) issues.push(`${q.id}: strategy_tip too short`);
  if (!q.trap_tag || String(q.trap_tag).trim().length < 10) issues.push(`${q.id}: trap_tag too short`);

  const normalizedChoices = (q.choices || []).map((choice) => normalizeChoice(choice));
  if (new Set(normalizedChoices).size !== normalizedChoices.length) {
    issues.push(`${q.id}: duplicate choices detected`);
  }

  const correctChoice = q.choices?.[q.answer_key];
  if (!correctChoice) {
    issues.push(`${q.id}: answer_key does not map to a choice`);
  } else if (!explanationMentionsChoice(q.explanation_steps, correctChoice)) {
    issues.push(`${q.id}: explanation does not reference correct choice clearly`);
  }

  const textFields = [
    q.stem,
    ...(Array.isArray(q.choices) ? q.choices : []),
    ...(Array.isArray(q.explanation_steps) ? q.explanation_steps : []),
    q.strategy_tip,
    q.trap_tag,
  ];
  textFields.forEach((value) => {
    const text = String(value || '');
    if (LATEX_MARKERS.some((pattern) => pattern.test(text))) {
      issues.push(`${q.id}: unresolved math/LaTeX marker found in verbal content`);
    }
  });
});

console.log('Verbal bank stats:', JSON.stringify(getVerbalStats(), null, 2));

if (issues.length) {
  console.error(`Validation issues (${issues.length}):`);
  issues.slice(0, 100).forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Verbal bank validation passed.');

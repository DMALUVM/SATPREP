import { VERBAL_QUESTION_BANK, getVerbalStats } from '../../src/satprep/content/verbalQuestionBank.js';

const issues = [];
const ids = new Set();

VERBAL_QUESTION_BANK.forEach((q, idx) => {
  if (!q.id) issues.push(`Missing id at index ${idx}`);
  if (ids.has(q.id)) issues.push(`Duplicate id ${q.id}`);
  ids.add(q.id);
  if (q.format !== 'multiple_choice') issues.push(`${q.id}: unsupported format ${q.format}`);
  if (!Array.isArray(q.choices) || q.choices.length !== 4) issues.push(`${q.id}: choices must have length 4`);
  if (typeof q.answer_key !== 'number' || q.answer_key < 0 || q.answer_key > 3) issues.push(`${q.id}: invalid answer_key`);
  if (!Array.isArray(q.explanation_steps) || q.explanation_steps.length < 2) issues.push(`${q.id}: explanation too short`);
});

console.log('Verbal bank stats:', JSON.stringify(getVerbalStats(), null, 2));

if (issues.length) {
  console.error(`Validation issues (${issues.length}):`);
  issues.slice(0, 100).forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log('Verbal bank validation passed.');

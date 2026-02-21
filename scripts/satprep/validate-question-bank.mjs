import {
  SAT_CANONICAL_QUESTIONS,
  SAT_QUESTION_VARIANTS,
  SAT_QUESTION_BANK,
  getQuestionBankStats,
  strictAuditQuestionBank,
  validateQuestionBank,
} from '../../src/satprep/content/questionBank.js';

const issues = validateQuestionBank(SAT_QUESTION_BANK);
const strictIssues = strictAuditQuestionBank(SAT_QUESTION_BANK);
const stats = getQuestionBankStats(SAT_QUESTION_BANK);

console.log('SAT Question Bank Stats');
console.log(JSON.stringify(stats, null, 2));
console.log(`Canonical questions: ${SAT_CANONICAL_QUESTIONS.length}`);
console.log(`Variants: ${SAT_QUESTION_VARIANTS.length}`);
console.log(`Total attempts: ${SAT_QUESTION_BANK.length}`);

if (issues.length) {
  console.error(`\nValidation issues (${issues.length}):`);
  issues.slice(0, 200).forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

if (strictIssues.length) {
  console.error(`\nStrict audit issues (${strictIssues.length}):`);
  strictIssues.slice(0, 200).forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log('\nValidation passed.');

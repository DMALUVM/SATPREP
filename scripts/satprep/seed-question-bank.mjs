import { createClient } from '@supabase/supabase-js';
import {
  SAT_CANONICAL_QUESTIONS,
  SAT_QUESTION_VARIANTS,
  QUESTION_BANK_VERSION,
} from '../../src/satprep/content/questionBank.js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function toCanonicalRow(question) {
  return {
    id: question.id,
    version: QUESTION_BANK_VERSION,
    domain: question.domain,
    skill: question.skill,
    difficulty: question.difficulty,
    format: question.format,
    module: question.module,
    calculator_allowed: !!question.calculator_allowed,
    stem: question.stem,
    choices: question.choices || null,
    answer_key: question.answer_key,
    explanation_steps: question.explanation_steps || [],
    strategy_tip: question.strategy_tip,
    trap_tag: question.trap_tag,
    target_seconds: question.target_seconds,
    tags: question.tags || [],
    template_key: question.template_key || null,
    template_seed: question.template_seed || null,
  };
}

function toVariantRow(question) {
  return {
    id: question.id,
    canonical_id: question.canonical_id,
    version: QUESTION_BANK_VERSION,
    stem: question.stem,
    choices: question.choices || null,
    answer_key: question.answer_key,
    explanation_steps: question.explanation_steps || [],
    strategy_tip: question.strategy_tip,
    trap_tag: question.trap_tag,
    variant_index: question.variant_index || 1,
  };
}

const canonicalRows = SAT_CANONICAL_QUESTIONS.map(toCanonicalRow);
const variantRows = SAT_QUESTION_VARIANTS.map(toVariantRow);

console.log(`Seeding ${canonicalRows.length} canonical questions and ${variantRows.length} variants...`);

const { error: canonicalError } = await supabase
  .from('sat_questions')
  .upsert(canonicalRows, { onConflict: 'id' });

if (canonicalError) {
  console.error('Canonical upsert failed:', canonicalError.message);
  process.exit(1);
}

const chunkSize = 500;
for (let i = 0; i < variantRows.length; i += chunkSize) {
  const chunk = variantRows.slice(i, i + chunkSize);
  // eslint-disable-next-line no-await-in-loop
  const { error } = await supabase.from('sat_question_variants').upsert(chunk, { onConflict: 'id' });
  if (error) {
    console.error(`Variant upsert failed at chunk ${i / chunkSize}:`, error.message);
    process.exit(1);
  }
}

console.log('Seeding complete.');

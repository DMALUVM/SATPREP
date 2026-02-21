import legacyQuestionsRaw from './legacyQuestions.js';

const DOMAIN_MAP = {
  algebra: 'algebra',
  'advanced-math': 'advanced-math',
  'problem-solving': 'problem-solving-data',
  geometry: 'geometry-trig',
};

const TARGET_SECONDS = {
  1: 65,
  2: 80,
  3: 95,
  4: 110,
  5: 125,
};

const QUESTION_BANK_VERSION = '2026.02.20.v1';

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick(rand, arr) {
  return arr[randInt(rand, 0, arr.length - 1)];
}

function shuffle(rand, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randInt(rand, 0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function formatNumber(n) {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(3)).toString();
}

function splitExplanation(text) {
  if (!text || typeof text !== 'string') return ['Review the worked solution and verify each algebra step.'];
  const cleaned = text
    .replace(/\$\$?/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\cdot/g, ' \u00B7 ')
    .replace(/\\times/g, ' \u00D7 ')
    .replace(/\\sqrt\{([^}]+)\}/g, '\u221A($1)')
    .replace(/\\leq?\b/g, '\u2264')
    .replace(/\\geq?\b/g, '\u2265')
    .replace(/\\neq\b/g, '\u2260')
    .replace(/\\pm\b/g, '\u00B1')
    .replace(/\\pi\b/g, '\u03C0')
    .replace(/\\theta\b/g, '\u03B8')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!parts.length) return ['Work the problem step by step, then check by substitution.'];
  return parts.slice(0, 4);
}

function makeMcChoices(rand, correctValue, spread = 8, precision = 0) {
  const values = new Set([Number(correctValue.toFixed(precision))]);
  let attempts = 0;
  while (values.size < 4 && attempts < 200) {
    attempts += 1;
    const delta = randInt(rand, -spread, spread);
    if (delta === 0) continue;
    const candidate = Number((correctValue + delta).toFixed(precision));
    values.add(candidate);
  }
  const choices = shuffle(rand, [...values]).map((v) => formatNumber(v));
  return {
    choices,
    answerKey: choices.indexOf(formatNumber(Number(correctValue.toFixed(precision)))),
  };
}

function normalizeLegacyQuestion(raw, index) {
  const domain = DOMAIN_MAP[raw.topic] || 'algebra';
  const difficulty = Math.max(1, Math.min(5, Number(raw.difficulty) || 3));
  const format = raw.type === 'grid-in' ? 'grid_in' : 'multiple_choice';
  const answerKey = format === 'multiple_choice' ? Number(raw.correctAnswer) : String(raw.correctAnswer);
  const questionId = raw.id || `legacy-${index + 1}`;

  return {
    id: `legacy-${questionId}`,
    domain,
    skill: raw.subtopic || raw.title || raw.topic || 'mixed-skill',
    difficulty,
    format,
    module: 'mixed',
    calculator_allowed: true,
    stem: raw.question,
    choices: format === 'multiple_choice' ? (raw.choices || []).map(String) : undefined,
    answer_key: answerKey,
    explanation_steps: splitExplanation(raw.explanation),
    strategy_tip: raw.strategy || 'Write the equation cleanly, solve, and verify with substitution.',
    trap_tag: raw.commonMistake || 'Sign errors and skipped arithmetic checks.',
    target_seconds: TARGET_SECONDS[difficulty],
    tags: [domain, raw.subtopic || 'mixed-skill', 'legacy-seed'],
  };
}

function buildTemplateQuestion(base) {
  return {
    module: 'mixed',
    calculator_allowed: true,
    target_seconds: TARGET_SECONDS[base.difficulty],
    tags: [base.domain, base.skill, 'generated-canonical', base.templateKey],
    ...base,
  };
}

function templateLinear(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 1777);
  const a = randInt(rand, 2, 11);
  const x = randInt(rand, -9, 16);
  const b = randInt(rand, -18, 20);
  const c = a * x + b;
  const difficulty = pick(rand, [1, 1, 2, 2, 3]);
  const useGrid = rand() < 0.25;
  if (useGrid) {
    return buildTemplateQuestion({
      id: `gen-linear-${seed}`,
      domain: 'algebra',
      skill: 'linear-equations',
      difficulty,
      format: 'grid_in',
      stem: `Solve for x: ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}`,
      answer_key: String(x),
      explanation_steps: [
        `Subtract ${b >= 0 ? Math.abs(b) : `-${Math.abs(b)}`} from both sides to isolate ${a}x.`,
        `Divide both sides by ${a}.`,
        `You get x = ${x}.`,
      ],
      strategy_tip: 'Undo addition/subtraction before multiplication/division.',
      trap_tag: 'Forgetting to apply the same operation to both sides.',
      templateKey: 'linear-equations',
      template_seed: seed,
    });
  }
  const { choices, answerKey } = makeMcChoices(rand, x, 9, 0);
  return buildTemplateQuestion({
    id: `gen-linear-${seed}`,
    domain: 'algebra',
    skill: 'linear-equations',
    difficulty,
    format: 'multiple_choice',
    stem: `If ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}, what is x?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Move the constant term to isolate ${a}x.`,
      `Divide both sides by ${a}.`,
      `The solution is x = ${x}.`,
    ],
    strategy_tip: 'Keep each inverse step on both sides of the equation.',
    trap_tag: 'Sign errors when moving a negative constant.',
    templateKey: 'linear-equations',
    template_seed: seed,
  });
}

function templateSlope(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 1831);
  const x1 = randInt(rand, -5, 4);
  const run = randInt(rand, 2, 6);
  const x2 = x1 + run;
  const m = randInt(rand, -4, 5) || 2;
  const y1 = randInt(rand, -9, 12);
  const y2 = y1 + m * run;
  const { choices, answerKey } = makeMcChoices(rand, m, 6, 0);
  return buildTemplateQuestion({
    id: `gen-slope-${seed}`,
    domain: 'algebra',
    skill: 'linear-functions',
    difficulty: pick(rand, [1, 2, 2, 3]),
    format: 'multiple_choice',
    stem: `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Use slope formula m = (y2 - y1)/(x2 - x1).`,
      `Compute (${y2} - ${y1})/(${x2} - ${x1}) = ${m}.`,
      `The slope is ${m}.`,
    ],
    strategy_tip: 'Always subtract y-values and x-values in the same order.',
    trap_tag: 'Swapping rise/run or mixing subtraction order.',
    templateKey: 'linear-functions',
    template_seed: seed,
  });
}

function templateSystems(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 1913);
  const x = randInt(rand, -6, 10);
  const y = randInt(rand, -5, 8);
  let a1 = randInt(rand, 1, 6);
  let b1 = randInt(rand, 1, 6);
  let a2 = randInt(rand, 1, 6);
  let b2 = randInt(rand, 1, 6);
  while (a1 * b2 === a2 * b1) {
    a2 = randInt(rand, 1, 6);
    b2 = randInt(rand, 1, 6);
  }
  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;
  const askForX = rand() < 0.5;
  const answer = askForX ? x : y;
  const useGrid = rand() < 0.2;
  if (useGrid) {
    return buildTemplateQuestion({
      id: `gen-systems-${seed}`,
      domain: 'algebra',
      skill: 'systems',
      difficulty: pick(rand, [2, 2, 3, 3, 4]),
      format: 'grid_in',
      stem: `Solve the system: ${a1}x + ${b1}y = ${c1} and ${a2}x + ${b2}y = ${c2}. What is ${askForX ? 'x' : 'y'}?`,
      answer_key: String(answer),
      explanation_steps: [
        'Use elimination or substitution to solve the two equations.',
        `The ordered pair solution is (${x}, ${y}).`,
        `Therefore ${askForX ? 'x' : 'y'} = ${answer}.`,
      ],
      strategy_tip: 'Choose elimination when coefficients already align.',
      trap_tag: 'Solving correctly but reporting the wrong variable.',
      templateKey: 'systems',
      template_seed: seed,
    });
  }
  const { choices, answerKey } = makeMcChoices(rand, answer, 8, 0);
  return buildTemplateQuestion({
    id: `gen-systems-${seed}`,
    domain: 'algebra',
    skill: 'systems',
    difficulty: pick(rand, [2, 2, 3, 3, 4]),
    format: 'multiple_choice',
    stem: `For the system ${a1}x + ${b1}y = ${c1} and ${a2}x + ${b2}y = ${c2}, what is ${askForX ? 'x' : 'y'}?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Solve the system with elimination/substitution.',
      `The solution is (${x}, ${y}).`,
      `Select ${askForX ? 'x' : 'y'} = ${answer}.`,
    ],
    strategy_tip: 'Check both equations after solving.',
    trap_tag: 'Choosing the other coordinate by mistake.',
    templateKey: 'systems',
    template_seed: seed,
  });
}

function templateInequality(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 1999);
  const a = randInt(rand, 2, 9);
  const xBoundary = randInt(rand, -5, 12);
  const b = randInt(rand, -12, 16);
  const c = a * xBoundary + b;
  const direction = pick(rand, ['>', '>=']);
  const valid = xBoundary + randInt(rand, 1, 4);
  const invalid = xBoundary - randInt(rand, 1, 4);
  const choiceSet = new Set([valid, invalid, xBoundary]);
  while (choiceSet.size < 4) {
    const candidate = xBoundary + randInt(rand, -7, 7);
    if (candidate === valid || candidate === invalid || candidate === xBoundary) continue;
    choiceSet.add(candidate);
  }
  const choicesRaw = [...choiceSet];
  const choices = shuffle(rand, choicesRaw).map((v) => String(v));
  const answerKey = choices.indexOf(String(valid));
  return buildTemplateQuestion({
    id: `gen-ineq-${seed}`,
    domain: 'algebra',
    skill: 'inequalities',
    difficulty: pick(rand, [2, 2, 3, 3, 4]),
    format: 'multiple_choice',
    stem: `Which value of x satisfies ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} ${direction} ${c}?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Solve boundary equation ${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c} to get x = ${xBoundary}.`,
      `For ${direction}, x must be ${direction === '>' ? 'greater than' : 'at least'} ${xBoundary}.`,
      `${valid} is the valid choice.`,
    ],
    strategy_tip: 'First find the boundary value, then test direction with one sample point.',
    trap_tag: 'Confusing strict vs inclusive inequality signs.',
    templateKey: 'inequalities',
    template_seed: seed,
  });
}

function templateQuadratic(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2053);
  const r1 = randInt(rand, -8, 8);
  const r2 = randInt(rand, -7, 9);
  const sum = r1 + r2;
  const prod = r1 * r2;
  const answer = Math.max(r1, r2);
  const { choices, answerKey } = makeMcChoices(rand, answer, 8, 0);
  return buildTemplateQuestion({
    id: `gen-quad-${seed}`,
    domain: 'advanced-math',
    skill: 'quadratics',
    difficulty: pick(rand, [2, 3, 3, 4]),
    format: 'multiple_choice',
    stem: `The equation x^2 ${sum <= 0 ? '+' : '-'} ${Math.abs(sum)}x ${prod >= 0 ? '+' : '-'} ${Math.abs(prod)} = 0 has two real roots. What is the larger root?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Factor as (x - ${r1})(x - ${r2}) = 0.`,
      `Roots are x = ${r1} and x = ${r2}.`,
      `The larger root is ${answer}.`,
    ],
    strategy_tip: 'Use Vieta/factoring patterns before using the quadratic formula.',
    trap_tag: 'Sign mistakes when translating from factored to standard form.',
    templateKey: 'quadratics',
    template_seed: seed,
  });
}

function templateExponent(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2131);
  const a = randInt(rand, 2, 8);
  const b = randInt(rand, 2, 8);
  const c = randInt(rand, 1, 6);
  const answer = a + b - c;
  const useGrid = rand() < 0.35;
  if (useGrid) {
    return buildTemplateQuestion({
      id: `gen-exp-${seed}`,
      domain: 'advanced-math',
      skill: 'exponents',
      difficulty: pick(rand, [2, 3, 3, 4]),
      format: 'grid_in',
      stem: `Simplify x^${a} * x^${b} / x^${c}. Enter the exponent of x in the simplified form.`,
      answer_key: String(answer),
      explanation_steps: [
        `Add exponents when multiplying: ${a} + ${b}.`,
        `Subtract exponents when dividing by x^${c}.`,
        `Final exponent is ${answer}.`,
      ],
      strategy_tip: 'Keep exponent rules separate: product adds, quotient subtracts.',
      trap_tag: 'Adding all three exponents instead of subtracting the denominator exponent.',
      templateKey: 'exponents',
      template_seed: seed,
    });
  }
  const { choices, answerKey } = makeMcChoices(rand, answer, 6, 0);
  return buildTemplateQuestion({
    id: `gen-exp-${seed}`,
    domain: 'advanced-math',
    skill: 'exponents',
    difficulty: pick(rand, [2, 3, 3, 4]),
    format: 'multiple_choice',
    stem: `What is the exponent of x in the simplified form of x^${a} * x^${b} / x^${c}?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Combine numerator exponents: ${a} + ${b}.`,
      `Subtract denominator exponent ${c}.`,
      `Resulting exponent is ${answer}.`,
    ],
    strategy_tip: 'Track exponent arithmetic explicitly to avoid mental slips.',
    trap_tag: 'Using multiplication/division on exponents instead of add/subtract.',
    templateKey: 'exponents',
    template_seed: seed,
  });
}

function templateFunctionEval(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2237);
  const a = randInt(rand, -3, 5) || 2;
  const b = randInt(rand, -9, 10);
  const c = randInt(rand, -8, 8);
  const x = randInt(rand, -4, 6);
  const answer = a * x * x + b * x + c;
  const { choices, answerKey } = makeMcChoices(rand, answer, 14, 0);
  return buildTemplateQuestion({
    id: `gen-func-${seed}`,
    domain: 'advanced-math',
    skill: 'functions',
    difficulty: pick(rand, [2, 3, 3, 4]),
    format: 'multiple_choice',
    stem: `If f(x) = ${a}x^2 ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}, what is f(${x})?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Substitute x = ${x} into the function.`,
      `Compute ${a}(${x}^2) ${b >= 0 ? '+' : '-'} ${Math.abs(b)}(${x}) ${c >= 0 ? '+' : '-'} ${Math.abs(c)}.`,
      `f(${x}) = ${answer}.`,
    ],
    strategy_tip: 'Use parentheses when plugging in negative values.',
    trap_tag: 'Forgetting to square the substituted value first.',
    templateKey: 'functions',
    template_seed: seed,
  });
}

function templatePolynomial(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2311);
  const a = randInt(rand, 1, 5);
  const b = randInt(rand, -7, 7);
  const c = randInt(rand, -6, 6);
  const d = randInt(rand, -8, 8);
  const coeffX = a + c;
  const constant = b + d;
  const askCoeff = rand() < 0.5;
  const answer = askCoeff ? coeffX : constant;
  const { choices, answerKey } = makeMcChoices(rand, answer, 8, 0);
  return buildTemplateQuestion({
    id: `gen-poly-${seed}`,
    domain: 'advanced-math',
    skill: 'polynomials',
    difficulty: pick(rand, [2, 3, 3, 4]),
    format: 'multiple_choice',
    stem: `For P(x) = (${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}) + (${c}x ${d >= 0 ? '+' : '-'} ${Math.abs(d)}), what is the ${askCoeff ? 'coefficient of x' : 'constant term'} in simplified form?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Combine like terms: (${a} + ${c})x + (${b} + ${d}).`,
      `Simplified form is ${coeffX}x ${constant >= 0 ? '+' : '-'} ${Math.abs(constant)}.`,
      `Requested value is ${answer}.`,
    ],
    strategy_tip: 'Group x-terms and constants separately before adding.',
    trap_tag: 'Losing a sign while combining constants.',
    templateKey: 'polynomials',
    template_seed: seed,
  });
}

function templatePercent(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2389);
  const base = randInt(rand, 40, 300);
  const pct = pick(rand, [5, 10, 12, 15, 20, 25, 30, 35]);
  const isIncrease = rand() < 0.5;
  const answer = Number((base * (isIncrease ? (1 + pct / 100) : (1 - pct / 100))).toFixed(2));
  const { choices, answerKey } = makeMcChoices(rand, answer, 40, answer % 1 === 0 ? 0 : 2);
  return buildTemplateQuestion({
    id: `gen-percent-${seed}`,
    domain: 'problem-solving-data',
    skill: 'percentages',
    difficulty: pick(rand, [1, 2, 2, 3]),
    format: 'multiple_choice',
    stem: `A value of ${base} is ${isIncrease ? 'increased' : 'decreased'} by ${pct}%. What is the new value?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Convert ${pct}% to decimal ${pct / 100}.`,
      `Use multiplier ${isIncrease ? `1 + ${pct / 100}` : `1 - ${pct / 100}`}.`,
      `New value = ${base} * ${isIncrease ? (1 + pct / 100) : (1 - pct / 100)} = ${formatNumber(answer)}.`,
    ],
    strategy_tip: 'Use percent multipliers for speed: original * (1 +/- rate).',
    trap_tag: 'Applying percent to the wrong base value.',
    templateKey: 'percentages',
    template_seed: seed,
  });
}

function templateMean(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2473);
  const n1 = randInt(rand, 10, 40);
  const n2 = randInt(rand, 15, 45);
  const n3 = randInt(rand, 20, 50);
  const n4 = randInt(rand, 12, 42);
  const targetMean = randInt(rand, 20, 45);
  const missing = targetMean * 5 - (n1 + n2 + n3 + n4);
  const { choices, answerKey } = makeMcChoices(rand, missing, 10, 0);
  return buildTemplateQuestion({
    id: `gen-mean-${seed}`,
    domain: 'problem-solving-data',
    skill: 'statistics',
    difficulty: pick(rand, [2, 2, 3, 3]),
    format: 'multiple_choice',
    stem: `The mean of five numbers is ${targetMean}. Four numbers are ${n1}, ${n2}, ${n3}, and ${n4}. What is the fifth number?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Total of 5 numbers must be 5 * ${targetMean} = ${targetMean * 5}.`,
      `Sum known values: ${n1 + n2 + n3 + n4}.`,
      `Missing number = ${targetMean * 5} - ${n1 + n2 + n3 + n4} = ${missing}.`,
    ],
    strategy_tip: 'For mean problems, compute required total first.',
    trap_tag: 'Dividing too early instead of solving for total sum.',
    templateKey: 'statistics',
    template_seed: seed,
  });
}

function templatePythagorean(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2591);
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
  ];
  const [a, b, c] = pick(rand, triples);
  const scale = randInt(rand, 1, 4);
  const leg1 = a * scale;
  const leg2 = b * scale;
  const hyp = c * scale;
  const askHyp = rand() < 0.7;
  const answer = askHyp ? hyp : leg1;
  const useGrid = rand() < 0.3;
  if (useGrid) {
    return buildTemplateQuestion({
      id: `gen-pyth-${seed}`,
      domain: 'geometry-trig',
      skill: 'right-triangles',
      difficulty: pick(rand, [1, 2, 2, 3]),
      format: 'grid_in',
      stem: askHyp
        ? `A right triangle has legs ${leg1} and ${leg2}. What is the hypotenuse?`
        : `A right triangle has hypotenuse ${hyp} and one leg ${leg2}. What is the other leg?`,
      answer_key: String(answer),
      explanation_steps: [
        'Apply the Pythagorean theorem a^2 + b^2 = c^2.',
        askHyp ? `Compute sqrt(${leg1}^2 + ${leg2}^2).` : `Compute sqrt(${hyp}^2 - ${leg2}^2).`,
        `The requested side is ${answer}.`,
      ],
      strategy_tip: 'Identify the hypotenuse first (largest side).',
      trap_tag: 'Adding instead of subtracting when solving for a leg.',
      templateKey: 'right-triangles',
      template_seed: seed,
    });
  }
  const { choices, answerKey } = makeMcChoices(rand, answer, 12, 0);
  return buildTemplateQuestion({
    id: `gen-pyth-${seed}`,
    domain: 'geometry-trig',
    skill: 'right-triangles',
    difficulty: pick(rand, [1, 2, 2, 3]),
    format: 'multiple_choice',
    stem: askHyp
      ? `A right triangle has legs ${leg1} and ${leg2}. What is the hypotenuse?`
      : `A right triangle has hypotenuse ${hyp} and one leg ${leg2}. What is the other leg?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Use a^2 + b^2 = c^2.',
      askHyp ? `c = sqrt(${leg1}^2 + ${leg2}^2)` : `a = sqrt(${hyp}^2 - ${leg2}^2)`,
      `Result: ${answer}.`,
    ],
    strategy_tip: 'Square values carefully before adding/subtracting.',
    trap_tag: 'Using the wrong side as c in the formula.',
    templateKey: 'right-triangles',
    template_seed: seed,
  });
}

function templateCircle(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2677);
  const h = randInt(rand, -6, 6);
  const k = randInt(rand, -6, 6);
  const r = randInt(rand, 2, 12);
  const useRadius = rand() < 0.55;
  const answer = useRadius ? r : `${h},${k}`;
  if (useRadius) {
    const { choices, answerKey } = makeMcChoices(rand, r, 8, 0);
    return buildTemplateQuestion({
      id: `gen-circle-${seed}`,
      domain: 'geometry-trig',
      skill: 'circles',
      difficulty: pick(rand, [2, 2, 3, 4]),
      format: 'multiple_choice',
      stem: `For the circle (x ${h >= 0 ? '-' : '+'} ${Math.abs(h)})^2 + (y ${k >= 0 ? '-' : '+'} ${Math.abs(k)})^2 = ${r * r}, what is the radius?`,
      choices,
      answer_key: answerKey,
      explanation_steps: [
        `Standard form is (x - h)^2 + (y - k)^2 = r^2.`,
        `Here r^2 = ${r * r}.`,
        `So r = ${r}.`,
      ],
      strategy_tip: 'Read radius from r^2 and take the positive square root.',
      trap_tag: 'Reporting r^2 instead of r.',
      templateKey: 'circles',
      template_seed: seed,
    });
  }

  return buildTemplateQuestion({
    id: `gen-circle-${seed}`,
    domain: 'geometry-trig',
    skill: 'circles',
    difficulty: pick(rand, [2, 3, 3, 4]),
    format: 'grid_in',
    stem: `For the circle (x ${h >= 0 ? '-' : '+'} ${Math.abs(h)})^2 + (y ${k >= 0 ? '-' : '+'} ${Math.abs(k)})^2 = ${r * r}, enter the center as h,k.`,
    answer_key: answer,
    explanation_steps: [
      `Match to (x - h)^2 + (y - k)^2 = r^2.`,
      `Center is (${h}, ${k}).`,
      `Enter as ${h},${k}.`,
    ],
    strategy_tip: 'Signs inside parentheses are opposite the center coordinates.',
    trap_tag: 'Flipping the center signs incorrectly.',
    templateKey: 'circles',
    template_seed: seed,
  });
}

function templateArea(seed, variant = 0) {
  const rand = mulberry32(seed + variant * 2741);
  const isTriangle = rand() < 0.5;
  if (isTriangle) {
    const b = randInt(rand, 3, 12) * 2;
    const h = randInt(rand, 4, 20);
    const answer = (b * h) / 2;
    const { choices, answerKey } = makeMcChoices(rand, answer, 20, 0);
    return buildTemplateQuestion({
      id: `gen-area-${seed}`,
      domain: 'geometry-trig',
      skill: 'area-perimeter',
      difficulty: pick(rand, [1, 2, 2, 3]),
      format: 'multiple_choice',
      stem: `A triangle has base ${b} and height ${h}. What is its area?`,
      choices,
      answer_key: answerKey,
      explanation_steps: [
        'Use triangle area formula A = 1/2 * b * h.',
        `Compute 1/2 * ${b} * ${h}.`,
        `Area = ${answer}.`,
      ],
      strategy_tip: 'Use perpendicular height, not slanted side length.',
      trap_tag: 'Forgetting the 1/2 factor for triangle area.',
      templateKey: 'area-perimeter',
      template_seed: seed,
    });
  }
  const l = randInt(rand, 5, 26);
  const w = randInt(rand, 4, 18);
  const answer = l * w;
  const { choices, answerKey } = makeMcChoices(rand, answer, 20, 0);
  return buildTemplateQuestion({
    id: `gen-area-${seed}`,
    domain: 'geometry-trig',
    skill: 'area-perimeter',
    difficulty: pick(rand, [1, 2, 2, 3]),
    format: 'multiple_choice',
    stem: `A rectangle has length ${l} and width ${w}. What is its area?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Use rectangle area formula A = l * w.',
      `Compute ${l} * ${w}.`,
      `Area = ${answer}.`,
    ],
    strategy_tip: 'Write the formula first to avoid mixing area/perimeter.',
    trap_tag: 'Using perimeter formula instead of area formula.',
    templateKey: 'area-perimeter',
    template_seed: seed,
  });
}

const TEMPLATE_REGISTRY = {
  'linear-equations': templateLinear,
  'linear-functions': templateSlope,
  systems: templateSystems,
  inequalities: templateInequality,
  quadratics: templateQuadratic,
  exponents: templateExponent,
  functions: templateFunctionEval,
  polynomials: templatePolynomial,
  percentages: templatePercent,
  statistics: templateMean,
  'right-triangles': templatePythagorean,
  circles: templateCircle,
  'area-perimeter': templateArea,
};

const TEMPLATE_PLAN = [
  { key: 'linear-equations', count: 22 },
  { key: 'linear-functions', count: 20 },
  { key: 'systems', count: 18 },
  { key: 'inequalities', count: 14 },
  { key: 'quadratics', count: 24 },
  { key: 'exponents', count: 22 },
  { key: 'functions', count: 20 },
  { key: 'polynomials', count: 20 },
  { key: 'percentages', count: 10 },
  { key: 'statistics', count: 9 },
  { key: 'right-triangles', count: 14 },
  { key: 'circles', count: 12 },
  { key: 'area-perimeter', count: 10 },
];

function generateTemplateCanonicals() {
  const generated = [];
  TEMPLATE_PLAN.forEach((plan) => {
    const factory = TEMPLATE_REGISTRY[plan.key];
    for (let i = 0; i < plan.count; i += 1) {
      const seed = hashString(`${plan.key}-${i + 1}`);
      const q = factory(seed, 0);
      q.id = `gen-${plan.key}-${i + 1}`;
      q.template_key = plan.key;
      q.template_seed = seed;
      generated.push(q);
    }
  });
  return generated;
}

function normalizeLegacyQuestions() {
  return legacyQuestionsRaw.map((q, idx) => normalizeLegacyQuestion(q, idx));
}

let CANONICAL_CACHE = null;
let VARIANT_CACHE = null;

export function buildCanonicalQuestionBank() {
  if (CANONICAL_CACHE) return CANONICAL_CACHE;
  const legacy = normalizeLegacyQuestions();
  const generated = generateTemplateCanonicals();
  CANONICAL_CACHE = [...legacy, ...generated];
  return CANONICAL_CACHE;
}

export function buildQuestionVariants(variantCountPerTemplateQuestion = 3) {
  if (VARIANT_CACHE) return VARIANT_CACHE;
  const canonicals = buildCanonicalQuestionBank();
  const variants = [];
  for (let i = 0; i < canonicals.length; i += 1) {
    const q = canonicals[i];
    if (!q.template_key || !TEMPLATE_REGISTRY[q.template_key]) continue;
    const factory = TEMPLATE_REGISTRY[q.template_key];
    for (let v = 1; v <= variantCountPerTemplateQuestion; v += 1) {
      const variantQuestion = factory(q.template_seed, v);
      variants.push({
        ...variantQuestion,
        id: `${q.id}-v${v}`,
        canonical_id: q.id,
        is_variant: true,
        variant_index: v,
        tags: [...(variantQuestion.tags || []), 'generated-variant'],
      });
    }
  }
  VARIANT_CACHE = variants;
  return VARIANT_CACHE;
}

export function buildFullQuestionBank() {
  return [...buildCanonicalQuestionBank(), ...buildQuestionVariants()];
}

export function validateQuestionBank(questionBank = buildFullQuestionBank()) {
  const issues = [];
  const ids = new Set();
  for (let i = 0; i < questionBank.length; i += 1) {
    const q = questionBank[i];
    if (!q.id) issues.push(`Question at index ${i} missing id`);
    if (ids.has(q.id)) issues.push(`Duplicate id: ${q.id}`);
    ids.add(q.id);

    if (!q.domain) issues.push(`${q.id}: missing domain`);
    if (!q.skill) issues.push(`${q.id}: missing skill`);
    if (!q.stem) issues.push(`${q.id}: missing stem`);
    if (!q.explanation_steps || !q.explanation_steps.length) issues.push(`${q.id}: missing explanation_steps`);

    if (q.format === 'multiple_choice') {
      if (!Array.isArray(q.choices) || q.choices.length !== 4) {
        issues.push(`${q.id}: multiple_choice must have 4 choices`);
      }
      if (typeof q.answer_key !== 'number' || q.answer_key < 0 || q.answer_key > 3) {
        issues.push(`${q.id}: invalid multiple_choice answer_key`);
      }
    }

    if (q.format === 'grid_in') {
      if (typeof q.answer_key !== 'string' && typeof q.answer_key !== 'number') {
        issues.push(`${q.id}: grid_in answer_key must be string or number`);
      }
    }
  }
  return issues;
}

function normalizeAuditText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeAuditChoice(value) {
  return normalizeAuditText(value).replace(/[^a-z0-9.+\-\/<>=,()]/g, '');
}

function explanationMentionsValue(steps, value) {
  const joined = normalizeAuditText((steps || []).join(' '));
  const raw = String(value ?? '').trim();
  if (!joined || !raw) return false;

  const normalizedRaw = normalizeAuditText(raw);
  if (joined.includes(normalizedRaw)) return true;

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const numericToken = formatNumber(numeric);
    if (joined.includes(normalizeAuditText(numericToken))) return true;
  }

  return false;
}

function compareTemplateQuestionToExpected(question, expected, issues) {
  if (!expected) {
    issues.push(`${question.id}: could not rebuild expected template question`);
    return;
  }

  const fields = ['domain', 'skill', 'difficulty', 'format', 'stem'];
  fields.forEach((field) => {
    if (String(question[field]) !== String(expected[field])) {
      issues.push(`${question.id}: template mismatch on ${field}`);
    }
  });

  if (String(question.answer_key) !== String(expected.answer_key)) {
    issues.push(`${question.id}: template mismatch on answer_key`);
  }

  if (question.format === 'multiple_choice') {
    const actualChoices = Array.isArray(question.choices) ? question.choices : [];
    const expectedChoices = Array.isArray(expected.choices) ? expected.choices : [];
    if (actualChoices.length !== expectedChoices.length) {
      issues.push(`${question.id}: template mismatch on choices length`);
    } else {
      const actualSet = new Set(actualChoices.map((c) => normalizeAuditChoice(c)));
      const expectedSet = new Set(expectedChoices.map((c) => normalizeAuditChoice(c)));
      if (actualSet.size !== expectedSet.size || [...actualSet].some((item) => !expectedSet.has(item))) {
        issues.push(`${question.id}: template mismatch on choices content`);
      }
      const actualCorrect = actualChoices[Number(question.answer_key)];
      const expectedCorrect = expectedChoices[Number(expected.answer_key)];
      if (normalizeAuditChoice(actualCorrect) !== normalizeAuditChoice(expectedCorrect)) {
        issues.push(`${question.id}: template mismatch on correct choice`);
      }
    }
  }
}

export function strictAuditQuestionBank(questionBank = buildFullQuestionBank()) {
  const issues = [...validateQuestionBank(questionBank)];

  for (let i = 0; i < questionBank.length; i += 1) {
    const q = questionBank[i];

    if (!q.strategy_tip || String(q.strategy_tip).trim().length < 10) {
      issues.push(`${q.id}: strategy_tip too short`);
    }
    if (!q.trap_tag || String(q.trap_tag).trim().length < 10) {
      issues.push(`${q.id}: trap_tag too short`);
    }

    if (q.format === 'multiple_choice') {
      const choices = Array.isArray(q.choices) ? q.choices : [];
      const normalizedChoices = choices.map((choice) => normalizeAuditChoice(choice));
      const uniqueChoices = new Set(normalizedChoices);
      if (uniqueChoices.size !== normalizedChoices.length) {
        issues.push(`${q.id}: duplicate answer choices detected`);
      }

      const answerIndex = Number(q.answer_key);
      const correctChoice = choices[answerIndex];
      if (typeof correctChoice === 'undefined') {
        issues.push(`${q.id}: answer_key does not map to a choice`);
      } else if (String(q.id).startsWith('gen-') && !explanationMentionsValue(q.explanation_steps, correctChoice)) {
        issues.push(`${q.id}: generated MC explanation does not clearly reference correct choice`);
      }
    }

    if (q.format === 'grid_in' && String(q.id).startsWith('gen-')) {
      if (!explanationMentionsValue(q.explanation_steps, q.answer_key)) {
        issues.push(`${q.id}: generated grid explanation does not clearly reference answer`);
      }
    }

    if (q.template_key) {
      if (!Number.isFinite(Number(q.template_seed))) {
        issues.push(`${q.id}: template_seed missing or invalid`);
        continue;
      }
      const factory = TEMPLATE_REGISTRY[q.template_key];
      if (!factory) {
        issues.push(`${q.id}: unknown template_key ${q.template_key}`);
        continue;
      }
      const variantIndex = Number(q.variant_index || 0);
      const expected = factory(Number(q.template_seed), variantIndex);
      compareTemplateQuestionToExpected(q, expected, issues);
    }
  }

  return issues;
}

export function getQuestionBankStats(questionBank = buildFullQuestionBank()) {
  const byDomain = {};
  const byDifficulty = {};
  let canonical = 0;
  let variants = 0;
  questionBank.forEach((q) => {
    byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    if (q.is_variant) variants += 1;
    else canonical += 1;
  });
  return {
    version: QUESTION_BANK_VERSION,
    total: questionBank.length,
    canonical,
    variants,
    byDomain,
    byDifficulty,
  };
}

export const SAT_QUESTION_BANK = buildFullQuestionBank();
export const SAT_CANONICAL_QUESTIONS = buildCanonicalQuestionBank();
export const SAT_QUESTION_VARIANTS = buildQuestionVariants();

export function findQuestionById(questionId) {
  const all = SAT_QUESTION_BANK;
  for (let i = 0; i < all.length; i += 1) {
    if (all[i].id === questionId) return all[i];
  }
  return null;
}

export { QUESTION_BANK_VERSION };

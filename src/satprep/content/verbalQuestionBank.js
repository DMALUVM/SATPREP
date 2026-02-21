const TARGET_SECONDS = {
  1: 65,
  2: 80,
  3: 95,
  4: 110,
  5: 125,
};

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
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

function shuffle(rand, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randInt(rand, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeChoices(rand, correct, distractors) {
  const choices = shuffle(rand, [correct, ...distractors]);
  return {
    choices,
    answerKey: choices.indexOf(correct),
  };
}

function buildQuestion(base) {
  return {
    format: 'multiple_choice',
    module: 'mixed',
    calculator_allowed: false,
    ...base,
    target_seconds: TARGET_SECONDS[base.difficulty] || 95,
  };
}

function agreementTemplate(seed) {
  const rand = mulberry32(seed);
  const subjects = [
    ['The committee', 'meets', 'meet'],
    ['Each of the players', 'is', 'are'],
    ['The data from the experiments', 'suggests', 'suggest'],
    ['A bouquet of roses', 'was', 'were'],
    ['Neither the coach nor the captains', 'are', 'is'],
  ];
  const [subject, singularVerb, pluralVerb] = subjects[randInt(rand, 0, subjects.length - 1)];
  const { choices, answerKey } = makeChoices(rand, singularVerb, [pluralVerb, `${singularVerb} being`, `${pluralVerb} being`]);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'subject-verb-agreement',
    difficulty: randInt(rand, 2, 4),
    stem: `Choose the best verb to complete the sentence: "${subject} ____ every Friday to review progress."`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Identify the grammatical subject: "${subject}".`,
      `Select the verb form that agrees with that subject in number.`,
      `"${singularVerb}" is the correct agreement choice.`,
    ],
    strategy_tip: 'Ignore prepositional phrases when identifying the true subject.',
    trap_tag: 'Matching the verb to a nearby noun instead of the real subject.',
  });
}

function punctuationTemplate(seed) {
  const rand = mulberry32(seed);
  const transitions = ['however', 'therefore', 'moreover', 'for example', 'in contrast'];
  const t = transitions[randInt(rand, 0, transitions.length - 1)];
  const correct = `; ${t},`;
  const { choices, answerKey } = makeChoices(rand, correct, [`, ${t},`, ` ${t} `, `: ${t}`]);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'punctuation-boundaries',
    difficulty: randInt(rand, 2, 4),
    stem: `The writer wants to connect two independent clauses: "The prototype failed the first test ____ the team improved the design." Which choice best completes the sentence?`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Two independent clauses need a semicolon, period, or conjunction strategy.',
      `Because "${t}" is a conjunctive adverb, use semicolon + transition + comma.`,
      `The correct punctuation is "${correct}".`,
    ],
    strategy_tip: 'When both sides could stand as full sentences, check for comma splices.',
    trap_tag: 'Using a lone comma between two independent clauses.',
  });
}

function transitionTemplate(seed) {
  const rand = mulberry32(seed);
  const sets = [
    {
      sentence: 'The city cut traffic lanes downtown. ____ bike accidents decreased by 18%.',
      correct: 'As a result,',
      wrong: ['For instance,', 'Likewise,', 'In other words,'],
    },
    {
      sentence: 'The first survey included only seniors. ____ the second survey included students from every grade.',
      correct: 'By contrast,',
      wrong: ['Consequently,', 'Similarly,', 'For example,'],
    },
    {
      sentence: 'Mina reread the paragraph several times. ____ she still misunderstood the author\'s claim.',
      correct: 'Even so,',
      wrong: ['Therefore,', 'Additionally,', 'In summary,'],
    },
  ];
  const sample = sets[randInt(rand, 0, sets.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'logical-transitions',
    difficulty: randInt(rand, 1, 3),
    stem: `Which transition best fits the context? ${sample.sentence}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Determine the relationship between the two clauses (contrast, cause/effect, continuation).',
      `Only "${sample.correct}" matches that relationship.`,
      'Remove choices that express the wrong logical direction.',
    ],
    strategy_tip: 'Do not choose by familiarity; choose by logical relationship.',
    trap_tag: 'Picking a transition with the wrong relationship (contrast vs cause).',
  });
}

function concisionTemplate(seed) {
  const rand = mulberry32(seed);
  const topics = ['project timeline', 'research summary', 'volunteer event', 'science fair'];
  const topic = topics[randInt(rand, 0, topics.length - 1)];
  const correct = `The ${topic} begins next week.`;
  const { choices, answerKey } = makeChoices(rand, correct, [
    `The ${topic} is scheduled to begin next week in time.`,
    `Next week is when the ${topic} will begin to start.`,
    `The ${topic} will be beginning in the next week period.`,
  ]);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'concision',
    difficulty: randInt(rand, 1, 3),
    stem: 'Which revision is most concise while preserving meaning?',
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Prefer the choice with no redundant words.',
      'Eliminate repetitive verbs and filler phrases.',
      `"${correct}" is the shortest clear option with full meaning.`,
    ],
    strategy_tip: 'On SAT Writing, shorter is better only when clarity is preserved.',
    trap_tag: 'Choosing wordy options that repeat the same idea.',
  });
}

function mainIdeaTemplate(seed) {
  const rand = mulberry32(seed);
  const passages = [
    {
      passage:
        'During the last decade, many libraries shifted funding from physical media to digital lending platforms. While critics argued this would reduce community traffic, attendance at library workshops rose each year because staff redirected shelf-management time toward public programming.',
      correct: 'Digital lending freed staff time that helped expand in-person programming.',
      wrong: [
        'Library attendance declined because of fewer printed books.',
        'Libraries eliminated physical books entirely over the decade.',
        'Critics fully supported the shift to digital lending.',
      ],
    },
    {
      passage:
        'Urban tree canopies lower street-level temperatures, but their impact depends on placement. Trees concentrated only in parks provide less heat relief than smaller clusters distributed near bus stops, schools, and sidewalks where residents spend daily time outdoors.',
      correct: 'Tree placement across daily-use areas matters more than concentrating trees in one zone.',
      wrong: [
        'Urban parks should replace all street trees.',
        'Heat relief from trees is too small to measure.',
        'Schools should avoid planting trees near sidewalks.',
      ],
    },
  ];

  const sample = passages[randInt(rand, 0, passages.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'main-idea',
    difficulty: randInt(rand, 2, 4),
    stem: `Read the passage and choose the best main idea.\n\n${sample.passage}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Main idea must capture the central claim and key support.',
      `"${sample.correct}" includes both the claim and the passage focus.`,
      'Reject answers that exaggerate or contradict passage details.',
    ],
    strategy_tip: 'Summarize the passage in one sentence before checking choices.',
    trap_tag: 'Choosing a detail instead of the central claim.',
  });
}

function inferenceTemplate(seed) {
  const rand = mulberry32(seed);
  const contexts = [
    {
      passage:
        'After piloting the app in two schools, the team changed the onboarding sequence from seven screens to three. In follow-up interviews, teachers reported that students began assignments faster and asked fewer setup questions.',
      correct: 'Simplifying onboarding likely reduced confusion for new users.',
      wrong: [
        'Teachers preferred the original seven-screen flow.',
        'The app was discontinued after the pilot.',
        'Students avoided using the app after setup.',
      ],
    },
    {
      passage:
        'The chemistry lab replaced single-use pipettes with reusable calibrated sets. Although initial costs increased, supply spending dropped over the next two terms.',
      correct: 'The switch increased upfront cost but lowered recurring expenses.',
      wrong: [
        'Reusable tools were less accurate than single-use tools.',
        'The lab budget increased every term after the switch.',
        'Single-use tools were required by policy.',
      ],
    },
  ];
  const sample = contexts[randInt(rand, 0, contexts.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'inference',
    difficulty: randInt(rand, 2, 4),
    stem: `Based on the passage, which inference is best supported?\n\n${sample.passage}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Inference must be supported by evidence, not speculation.',
      `The passage supports that "${sample.correct}".`,
      'Eliminate choices introducing claims not present in the text.',
    ],
    strategy_tip: 'Point to exact words in the passage that justify your inference.',
    trap_tag: 'Picking a choice that sounds plausible but is not text-supported.',
  });
}

function vocabTemplate(seed) {
  const rand = mulberry32(seed);
  const samples = [
    {
      sentence: 'Because the scientist was careful to avoid broad claims, her conclusion was notably restrained.',
      target: 'restrained',
      correct: 'measured',
      wrong: ['hostile', 'celebratory', 'confusing'],
    },
    {
      sentence: 'The intern provided a concise summary that highlighted only the most essential findings.',
      target: 'concise',
      correct: 'brief',
      wrong: ['emotional', 'incorrect', 'dramatic'],
    },
    {
      sentence: 'By revising the proposal repeatedly, Amir produced a polished final draft.',
      target: 'polished',
      correct: 'refined',
      wrong: ['angry', 'temporary', 'uncertain'],
    },
  ];
  const sample = samples[randInt(rand, 0, samples.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'vocab-in-context',
    difficulty: randInt(rand, 1, 3),
    stem: `As used in the sentence, ${sample.target} most nearly means: "${sample.sentence}"`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Use surrounding context, not the word alone.',
      `Context shows ${sample.target} means ${sample.correct}.`,
      'Reject choices with correct dictionary meaning but wrong tone/context.',
    ],
    strategy_tip: 'Replace the target word with each choice and test sentence meaning.',
    trap_tag: 'Choosing a familiar synonym that does not match context tone.',
  });
}

function evidenceTemplate(seed) {
  const rand = mulberry32(seed);
  const cases = [
    {
      passage:
        'A district introduced short daily advisory periods focused on planning and organization. After one semester, assignment completion rates rose and late submissions dropped by 14 percent.',
      question: 'Which detail would best support the claim that advisory periods improved student habits?',
      correct: 'Late submissions decreased by 14 percent after implementation.',
      wrong: [
        'The advisory period occurred each morning.',
        'Teachers helped design the advisory curriculum.',
        'Students met in groups of about twenty.',
      ],
    },
    {
      passage:
        'When the cafeteria shifted fruit displays from side counters to the main checkout line, fruit purchases increased during lunch periods across all grade levels.',
      question: 'Which detail most directly supports a causal link between placement and purchases?',
      correct: 'Fruit purchases increased after displays moved to the checkout line.',
      wrong: [
        'The cafeteria serves lunch in two time blocks.',
        'Apples and oranges were both offered.',
        'The display baskets were wooden.',
      ],
    },
  ];
  const sample = cases[randInt(rand, 0, cases.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'textual-evidence',
    difficulty: randInt(rand, 2, 4),
    stem: `${sample.passage}\n\n${sample.question}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Pick evidence that directly supports the stated claim.',
      `"${sample.correct}" is directly tied to the claim.`,
      'Discard details that are true but not relevant evidence.',
    ],
    strategy_tip: 'Ask: does this line prove the claim or just describe context?',
    trap_tag: 'Selecting background detail instead of proof detail.',
  });
}

const TEMPLATE_PLAN = [
  ['agreement', 40, agreementTemplate],
  ['punctuation', 36, punctuationTemplate],
  ['transition', 34, transitionTemplate],
  ['concision', 30, concisionTemplate],
  ['main-idea', 32, mainIdeaTemplate],
  ['inference', 30, inferenceTemplate],
  ['vocab', 24, vocabTemplate],
  ['evidence', 24, evidenceTemplate],
];

export const VERBAL_QUESTION_BANK = TEMPLATE_PLAN.flatMap(([key, count, factory]) => {
  const set = [];
  for (let i = 1; i <= count; i += 1) {
    const seed = hashString(`${key}-${i}`);
    const question = factory(seed);
    set.push({
      id: `verbal-${key}-${i}`,
      ...question,
      tags: ['verbal', key],
    });
  }
  return set;
});

export function getVerbalStats() {
  const bySkill = {};
  VERBAL_QUESTION_BANK.forEach((q) => {
    bySkill[q.skill] = (bySkill[q.skill] || 0) + 1;
  });

  return {
    total: VERBAL_QUESTION_BANK.length,
    bySkill,
    reading: VERBAL_QUESTION_BANK.filter((q) => q.domain === 'verbal-reading').length,
    writing: VERBAL_QUESTION_BANK.filter((q) => q.domain === 'verbal-writing').length,
  };
}

export function buildVerbalSet({ section = 'mixed', count = 20, difficulty = 'all' } = {}) {
  let pool = VERBAL_QUESTION_BANK.slice();
  if (section !== 'mixed') {
    pool = pool.filter((q) => q.domain === section);
  }

  if (difficulty !== 'all') {
    if (difficulty === 'easy') pool = pool.filter((q) => q.difficulty <= 2);
    if (difficulty === 'medium') pool = pool.filter((q) => q.difficulty === 3);
    if (difficulty === 'hard') pool = pool.filter((q) => q.difficulty >= 4);
  }

  return shuffle(mulberry32(hashString(`${section}-${count}-${difficulty}-${Date.now()}`)), pool).slice(0, count);
}

export function buildAdaptiveVerbalSet({
  section = 'mixed',
  count = 20,
  difficulty = 'all',
  weakSkills = [],
  strongSkills = [],
} = {}) {
  let pool = VERBAL_QUESTION_BANK.slice();
  if (section !== 'mixed') {
    pool = pool.filter((q) => q.domain === section);
  }

  if (difficulty !== 'all') {
    if (difficulty === 'easy') pool = pool.filter((q) => q.difficulty <= 2);
    if (difficulty === 'medium') pool = pool.filter((q) => q.difficulty === 3);
    if (difficulty === 'hard') pool = pool.filter((q) => q.difficulty >= 4);
  }

  const weakSkillSet = new Set((weakSkills || []).map((row) => row.skill || row));
  const strongSkillSet = new Set((strongSkills || []).map((row) => row.skill || row));
  const rng = mulberry32(hashString(`${section}-${count}-${difficulty}-${Date.now()}-adaptive`));

  const weakPool = pool.filter((q) => weakSkillSet.has(q.skill));
  const nonStrongPool = pool.filter((q) => !strongSkillSet.has(q.skill));
  const maintenancePool = pool.filter((q) => strongSkillSet.has(q.skill));

  const targetWeak = weakPool.length ? Math.max(1, Math.round(count * 0.65)) : 0;
  const targetMixed = Math.max(0, count - targetWeak - 2);
  const selected = [];
  const used = new Set();

  const take = (source, needed) => {
    const chunk = shuffle(rng, source).filter((q) => !used.has(q.id)).slice(0, needed);
    chunk.forEach((q) => {
      used.add(q.id);
      selected.push(q);
    });
  };

  take(weakPool, targetWeak);
  take(nonStrongPool, targetMixed);
  take(maintenancePool, Math.max(0, count - selected.length));

  if (selected.length < count) {
    take(pool, count - selected.length);
  }

  return selected.slice(0, count);
}

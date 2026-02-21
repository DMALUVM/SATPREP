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

// ── WRITING: Subject-Verb Agreement ──

const AGREEMENT_SUBJECTS = [
  ['The committee', 'meets', 'meet'],
  ['Each of the players', 'is', 'are'],
  ['The data from the experiments', 'suggests', 'suggest'],
  ['A bouquet of roses', 'was', 'were'],
  ['Neither the coach nor the captains', 'are', 'is'],
  ['The group of scientists', 'has', 'have'],
  ['Every student in the advanced classes', 'was', 'were'],
  ['The collection of rare stamps', 'belongs', 'belong'],
  ['One of the managers', 'oversees', 'oversee'],
  ['The series of lectures', 'covers', 'cover'],
  ['Either the director or the editors', 'review', 'reviews'],
  ['The flock of geese', 'migrates', 'migrate'],
];

const AGREEMENT_CONTEXTS = [
  'every Friday to review progress.',
  'at the start of each quarter.',
  'before any final decisions are made.',
  'after the preliminary round ends.',
  'when the semester officially begins.',
  'during the annual planning session.',
];

function agreementTemplate(seed) {
  const rand = mulberry32(seed);
  const [subject, correctVerb, wrongVerb] = AGREEMENT_SUBJECTS[randInt(rand, 0, AGREEMENT_SUBJECTS.length - 1)];
  const context = AGREEMENT_CONTEXTS[randInt(rand, 0, AGREEMENT_CONTEXTS.length - 1)];
  const { choices, answerKey } = makeChoices(rand, correctVerb, [wrongVerb, `${correctVerb} being`, `${wrongVerb} being`]);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'subject-verb-agreement',
    difficulty: randInt(rand, 2, 4),
    stem: `Choose the best verb to complete the sentence: "${subject} ____ ${context}"`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      `Identify the grammatical subject: "${subject}".`,
      'Ignore prepositional phrases and modifiers between subject and verb.',
      `"${correctVerb}" is the correct agreement choice.`,
    ],
    strategy_tip: 'Cross out everything between the subject and the blank, then check agreement.',
    trap_tag: 'Matching the verb to a nearby noun instead of the real subject.',
  });
}

// ── WRITING: Punctuation Boundaries ──

const PUNCTUATION_TRANSITIONS = ['however', 'therefore', 'moreover', 'for example', 'in contrast', 'consequently', 'nevertheless', 'furthermore', 'meanwhile', 'instead'];

const PUNCTUATION_CLAUSES = [
  ['The prototype failed the first test', 'the team improved the design'],
  ['Enrollment in the program declined', 'funding was redirected to outreach'],
  ['The initial estimate proved too low', 'the board approved additional spending'],
  ['Sales improved during the second quarter', 'the company decided to expand its workforce'],
  ['The storm delayed construction by three weeks', 'the project manager revised the timeline'],
  ['Early reviews were largely negative', 'the director made significant changes to the script'],
];

function punctuationTemplate(seed) {
  const rand = mulberry32(seed);
  const t = PUNCTUATION_TRANSITIONS[randInt(rand, 0, PUNCTUATION_TRANSITIONS.length - 1)];
  const [clause1, clause2] = PUNCTUATION_CLAUSES[randInt(rand, 0, PUNCTUATION_CLAUSES.length - 1)];
  const correct = `; ${t},`;
  const { choices, answerKey } = makeChoices(rand, correct, [`, ${t},`, ` ${t} `, `: ${t}`]);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'punctuation-boundaries',
    difficulty: randInt(rand, 2, 4),
    stem: `The writer wants to connect two independent clauses: "${clause1} ____ ${clause2}." Which choice best completes the sentence?`,
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

// ── WRITING: Logical Transitions ──

const TRANSITION_SETS = [
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
  {
    sentence: 'The museum extended its hours on weekends. ____ attendance on Saturdays increased by 30%.',
    correct: 'Consequently,',
    wrong: ['However,', 'On the other hand,', 'Specifically,'],
  },
  {
    sentence: 'The candidate emphasized fiscal responsibility. ____ her opponent focused on social programs.',
    correct: 'In contrast,',
    wrong: ['Similarly,', 'Therefore,', 'In addition,'],
  },
  {
    sentence: 'Several students earned perfect scores on the unit test. ____ the teacher praised their dedication.',
    correct: 'Accordingly,',
    wrong: ['Nevertheless,', 'Alternatively,', 'On the contrary,'],
  },
  {
    sentence: 'The drought lasted six months. ____ some farmers lost their entire harvest.',
    correct: 'As a result,',
    wrong: ['In contrast,', 'Similarly,', 'For instance,'],
  },
  {
    sentence: 'The novel was praised for its vivid characters. ____ critics found the plot predictable.',
    correct: 'However,',
    wrong: ['Furthermore,', 'In fact,', 'Likewise,'],
  },
];

function transitionTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = TRANSITION_SETS[randInt(rand, 0, TRANSITION_SETS.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'logical-transitions',
    difficulty: randInt(rand, 1, 4),
    stem: `Which transition best fits the context? ${sample.sentence}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Determine the relationship between the two clauses (contrast, cause/effect, continuation).',
      `Only "${sample.correct}" matches that relationship.`,
      'Remove choices that express the wrong logical direction.',
    ],
    strategy_tip: 'Label the relationship first (cause, contrast, addition, example) then pick.',
    trap_tag: 'Picking a transition with the wrong relationship (contrast vs cause).',
  });
}

// ── WRITING: Concision ──

const CONCISION_SETS = [
  {
    correct: 'The project timeline begins next week.',
    wordy: [
      'The project timeline is scheduled to begin next week in time.',
      'Next week is when the project timeline will begin to start.',
      'The project timeline will be beginning in the next week period.',
    ],
  },
  {
    correct: 'The researcher confirmed the results.',
    wordy: [
      'The researcher confirmed and verified the results were accurate.',
      'It was confirmed by the researcher that the results were what they were.',
      'The researcher, in confirming, stated that the results were confirmed.',
    ],
  },
  {
    correct: 'The report summarizes recent findings.',
    wordy: [
      'The report provides a summary of the recent findings that were found.',
      'What the report does is summarize the findings that are recent.',
      'The report gives a summarized overview of the recent findings discovered.',
    ],
  },
  {
    correct: 'The manager approved the budget.',
    wordy: [
      'The manager gave her approval of the budget that was proposed.',
      'It was the manager who made the decision to approve the budget.',
      'The budget was approved by the manager who was in charge.',
    ],
  },
  {
    correct: 'Students improved their test scores.',
    wordy: [
      'Students were able to improve upon and raise their test scores.',
      'The test scores of students showed improvement and got better.',
      'It was the students whose test scores improved and went up.',
    ],
  },
];

function concisionTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = CONCISION_SETS[randInt(rand, 0, CONCISION_SETS.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wordy);
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
      `"${sample.correct}" is the shortest clear option with full meaning.`,
    ],
    strategy_tip: 'On SAT Writing, shorter is better only when clarity is preserved.',
    trap_tag: 'Choosing wordy options that repeat the same idea.',
  });
}

// ── READING: Main Idea (longer passages) ──

const MAIN_IDEA_PASSAGES = [
  {
    passage:
      'During the last decade, many libraries shifted funding from physical media to digital lending platforms. While critics argued this would reduce community traffic, attendance at library workshops rose each year because staff redirected shelf-management time toward public programming. The shift also allowed smaller branch libraries in underserved neighborhoods to offer the same catalog as the main branch, reducing a longstanding equity gap in access to new releases.',
    correct: 'Digital lending expanded access and freed resources that strengthened in-person community programming.',
    wrong: [
      'Library attendance declined because of fewer printed books.',
      'Libraries eliminated physical books entirely over the decade.',
      'Critics fully supported the shift to digital lending.',
    ],
  },
  {
    passage:
      'Urban tree canopies lower street-level temperatures, but their impact depends on placement. Trees concentrated only in parks provide less heat relief than smaller clusters distributed near bus stops, schools, and sidewalks where residents spend daily time outdoors. A 2024 study in Phoenix found that neighborhoods with dispersed tree cover experienced average peak temperatures 3.2 degrees Fahrenheit lower than those with the same number of trees grouped in a single park.',
    correct: 'Distributing trees across daily-use areas cools neighborhoods more effectively than concentrating them in parks.',
    wrong: [
      'Urban parks should replace all street trees.',
      'Heat relief from trees is too small to measure accurately.',
      'Schools should avoid planting trees near sidewalks due to safety.',
    ],
  },
  {
    passage:
      'Coral reef restoration projects have historically relied on transplanting nursery-grown fragments onto damaged reefs. However, a team of marine biologists in the Caribbean recently demonstrated that playing recordings of healthy reef sounds near degraded sites attracted fish larvae at nearly double the typical rate. The increased larval settlement then accelerated natural coral regrowth, suggesting that acoustic enrichment could complement physical restoration methods rather than replace them.',
    correct: 'Reef sound playback can boost natural recovery by attracting larvae, supplementing traditional transplant methods.',
    wrong: [
      'Physical transplanting of coral fragments has been entirely abandoned.',
      'Sound recordings harm fish populations near degraded reefs.',
      'Acoustic methods alone are sufficient for full reef restoration.',
    ],
  },
  {
    passage:
      'Although sleep-tracking wearables have surged in popularity, a growing body of research suggests their feedback can backfire. Psychologists at Northwestern University found that users who received negative sleep scores reported higher next-day fatigue even when objective polysomnography data showed their sleep quality was normal. The researchers termed this phenomenon "orthosomnia" — anxiety about achieving perfect sleep metrics that paradoxically disrupts sleep itself.',
    correct: 'Sleep-tracker feedback can worsen perceived fatigue by creating anxiety about sleep quality.',
    wrong: [
      'Sleep-tracking devices provide universally accurate health data.',
      'Orthosomnia affects only people with pre-existing sleep disorders.',
      'Researchers recommend all users stop wearing sleep trackers.',
    ],
  },
  {
    passage:
      'Community land trusts (CLTs) acquire property and retain ownership of the land while selling the buildings on it at below-market prices. When homeowners later sell, CLT resale formulas cap the profit so the next buyer also pays an affordable price. Critics argue that capped appreciation limits wealth-building for low-income families, but a 2023 Lincoln Institute study found that CLT homeowners built equity at rates comparable to conventional owners in similar neighborhoods because their lower mortgage payments allowed higher savings rates.',
    correct: 'CLTs maintain affordability across buyers while enabling comparable equity growth through lower housing costs.',
    wrong: [
      'CLTs prevent all homeowners from building any equity.',
      'Conventional homeownership always produces more wealth than CLT ownership.',
      'The Lincoln Institute study recommended abolishing resale formulas.',
    ],
  },
  {
    passage:
      'In the 1990s, linguists predicted that the internet would homogenize global English into a single dialect. Three decades later, the opposite has occurred: social media has amplified regional slang, code-switching, and non-standard grammar into widely recognized registers. Researchers at Georgetown analyzed 12 million tweets and found that dialect-specific hashtags grew faster than Standard English hashtags between 2015 and 2022, suggesting that digital communication reinforces rather than erases linguistic diversity.',
    correct: 'Contrary to predictions, digital communication has strengthened rather than diminished linguistic diversity.',
    wrong: [
      'The internet has unified all English speakers into one dialect.',
      'Social media users exclusively use Standard English grammar.',
      'Georgetown researchers found dialect hashtags declining after 2015.',
    ],
  },
];

function mainIdeaTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = MAIN_IDEA_PASSAGES[randInt(rand, 0, MAIN_IDEA_PASSAGES.length - 1)];
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

// ── READING: Inference (longer passages) ──

const INFERENCE_PASSAGES = [
  {
    passage:
      'After piloting the app in two schools, the team changed the onboarding sequence from seven screens to three. In follow-up interviews, teachers reported that students began assignments faster and asked fewer setup questions. The team noted that the reduced onboarding also freed five minutes per class period that teachers could reallocate to direct instruction.',
    correct: 'Simplifying onboarding reduced confusion and recovered instructional time.',
    wrong: [
      'Teachers preferred the original seven-screen flow.',
      'The app was discontinued after the pilot.',
      'Students avoided using the app after the change.',
    ],
  },
  {
    passage:
      'The chemistry lab replaced single-use pipettes with reusable calibrated sets. Although initial costs increased by 40%, supply spending dropped by 22% over the next two terms. Lab supervisors also reported fewer calibration errors, which they attributed to the higher precision of the reusable instruments.',
    correct: 'The switch to reusable pipettes reduced long-term costs and improved measurement accuracy.',
    wrong: [
      'Reusable tools were less accurate than single-use tools.',
      'The lab budget increased every term after the switch.',
      'Single-use tools were mandated by safety regulations.',
    ],
  },
  {
    passage:
      'A longitudinal study tracked 800 college freshmen who received structured peer mentoring during their first semester. By the end of sophomore year, mentored students had a 12% higher retention rate than unmentored peers and reported greater confidence in course selection. Researchers controlled for prior academic performance and socioeconomic background, finding that the mentoring effect persisted across all subgroups.',
    correct: 'Peer mentoring during freshman year significantly improved retention regardless of students\' backgrounds.',
    wrong: [
      'Unmentored students outperformed mentored students academically.',
      'The mentoring effect only benefited students from wealthy backgrounds.',
      'Researchers could not separate mentoring effects from other variables.',
    ],
  },
  {
    passage:
      'When the transit authority added real-time bus arrival screens at 15 high-traffic stops, ridership at those stops increased 9% within six months. Surveys revealed that passengers valued the reduction in perceived wait time more than any actual change in bus frequency. At stops without the screens, ridership remained flat during the same period.',
    correct: 'The perception of shorter waits, not actual schedule changes, drove the ridership increase.',
    wrong: [
      'Bus frequency was increased at all 15 stops.',
      'Passengers at stops with screens reported longer perceived wait times.',
      'Ridership increased equally at stops with and without screens.',
    ],
  },
  {
    passage:
      'Ecologists studying wolf reintroduction in Yellowstone observed that elk herds began avoiding open riverbanks where they were vulnerable to predation. This behavioral shift allowed willow and aspen saplings to regenerate along the rivers for the first time in decades. The restored vegetation stabilized riverbanks, reduced erosion, and created habitat for beaver, songbird, and amphibian populations that had declined.',
    correct: 'Wolf reintroduction triggered a chain of ecological recoveries by altering elk grazing behavior.',
    wrong: [
      'Elk populations increased after wolf reintroduction.',
      'Wolves directly planted willow saplings along the rivers.',
      'Beaver populations declined further after wolves returned.',
    ],
  },
  {
    passage:
      'A pharmaceutical company tested two versions of patient instruction leaflets for a new medication. Version A used standard medical terminology with a reading level of grade 12. Version B used plain language at a grade 6 reading level. Patients given Version B correctly identified the dosage schedule 94% of the time compared to 67% for Version A. However, some clinicians expressed concern that simplifying language might omit important nuances about drug interactions.',
    correct: 'Plain-language instructions dramatically improved patient comprehension but raised concerns about completeness.',
    wrong: [
      'Clinicians unanimously preferred the plain-language version.',
      'Version A produced higher comprehension rates than Version B.',
      'The study found no meaningful difference between the two versions.',
    ],
  },
];

function inferenceTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = INFERENCE_PASSAGES[randInt(rand, 0, INFERENCE_PASSAGES.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'inference',
    difficulty: randInt(rand, 2, 5),
    stem: `Based on the passage, which inference is best supported?\n\n${sample.passage}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Inference must be supported by evidence, not speculation.',
      `The passage supports that "${sample.correct}".`,
      'Eliminate choices introducing claims not present in the text.',
    ],
    strategy_tip: 'Point to exact words in the passage that justify your inference before choosing.',
    trap_tag: 'Picking a choice that sounds plausible but is not text-supported.',
  });
}

// ── READING: Vocab in Context ──

const VOCAB_SAMPLES = [
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
  {
    sentence: 'The director\'s vision for the film was ambitious, spanning three decades and four continents.',
    target: 'ambitious',
    correct: 'far-reaching',
    wrong: ['reckless', 'modest', 'impractical'],
  },
  {
    sentence: 'Critics described the author\'s prose as spare, noting its lack of ornamental language.',
    target: 'spare',
    correct: 'unadorned',
    wrong: ['excessive', 'available', 'charitable'],
  },
  {
    sentence: 'The evidence against the theory was compelling, persuading even longtime supporters to reconsider.',
    target: 'compelling',
    correct: 'convincing',
    wrong: ['forced', 'weak', 'artistic'],
  },
  {
    sentence: 'Her candid assessment of the project surprised the team, who expected diplomatic phrasing.',
    target: 'candid',
    correct: 'frank',
    wrong: ['deceptive', 'rehearsed', 'cheerful'],
  },
  {
    sentence: 'The council\'s decision to elevate the proposal came after months of deliberation.',
    target: 'elevate',
    correct: 'advance',
    wrong: ['lift physically', 'reject', 'postpone'],
  },
];

function vocabTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = VOCAB_SAMPLES[randInt(rand, 0, VOCAB_SAMPLES.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'vocab-in-context',
    difficulty: randInt(rand, 1, 4),
    stem: `As used in the sentence, "${sample.target}" most nearly means:\n\n"${sample.sentence}"`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Use surrounding context, not the word alone.',
      `Context shows "${sample.target}" means "${sample.correct}".`,
      'Reject choices with correct dictionary meaning but wrong tone/context.',
    ],
    strategy_tip: 'Replace the target word with each choice and test if the sentence meaning holds.',
    trap_tag: 'Choosing a familiar synonym that does not match context tone.',
  });
}

// ── READING: Textual Evidence ──

const EVIDENCE_CASES = [
  {
    passage:
      'A district introduced short daily advisory periods focused on planning and organization. After one semester, assignment completion rates rose and late submissions dropped by 14 percent. Teachers noted that students who previously struggled with multi-step assignments showed the most improvement.',
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
      'When the cafeteria shifted fruit displays from side counters to the main checkout line, fruit purchases increased during lunch periods across all grade levels. The change cost nothing to implement because it only required rearranging existing furniture.',
    question: 'Which detail most directly supports a causal link between placement and purchases?',
    correct: 'Fruit purchases increased after displays moved to the checkout line.',
    wrong: [
      'The cafeteria serves lunch in two time blocks.',
      'Apples and oranges were both offered.',
      'The display baskets were wooden.',
    ],
  },
  {
    passage:
      'Historians have long debated whether the printing press was the primary driver of the Protestant Reformation. A recent analysis of parish records in Germany found that towns with printing presses adopted reformist practices an average of 8 years earlier than those without. However, the study also noted that literacy rates, trade routes, and proximity to university towns were confounding factors.',
    question: 'Which detail best supports the claim that the printing press accelerated reform adoption?',
    correct: 'Towns with presses adopted reformist practices 8 years earlier than those without.',
    wrong: [
      'Literacy rates varied across German parishes.',
      'Historians have long debated the question.',
      'University towns were close to trade routes.',
    ],
  },
  {
    passage:
      'A randomized trial gave half of 500 patients a medication reminder app and the other half standard written instructions. After 90 days, the app group\'s medication adherence rate was 89% compared to 71% for the control group. Notably, the improvement was strongest among patients managing three or more prescriptions simultaneously.',
    question: 'Which evidence best supports the claim that the app improved medication adherence?',
    correct: 'The app group achieved 89% adherence versus 71% for the control group.',
    wrong: [
      'The trial included 500 patients total.',
      'Some patients managed three or more prescriptions.',
      'The study lasted 90 days.',
    ],
  },
  {
    passage:
      'After a coastal town installed a seawall, beach erosion on the protected stretch slowed significantly. However, sediment that previously replenished beaches further south was now blocked by the wall. Within two years, two neighboring beaches lost an average of 15 feet of shoreline.',
    question: 'Which detail best supports the claim that the seawall had unintended consequences?',
    correct: 'Two neighboring beaches lost 15 feet of shoreline within two years.',
    wrong: [
      'The seawall was installed to protect one stretch of beach.',
      'Beach erosion on the protected stretch slowed.',
      'Sediment naturally moves along the coast.',
    ],
  },
];

function evidenceTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = EVIDENCE_CASES[randInt(rand, 0, EVIDENCE_CASES.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'textual-evidence',
    difficulty: randInt(rand, 2, 5),
    stem: `${sample.passage}\n\n${sample.question}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Pick evidence that directly supports the stated claim.',
      `"${sample.correct}" is directly tied to the claim.`,
      'Discard details that are true but not relevant evidence.',
    ],
    strategy_tip: 'Ask: does this line PROVE the claim, or just describe context?',
    trap_tag: 'Selecting background detail instead of proof detail.',
  });
}

// ── READING: Rhetorical Purpose (NEW — what trips up 600-level scorers) ──

const PURPOSE_PASSAGES = [
  {
    passage:
      'The mayor\'s proposal to convert abandoned lots into community gardens faced initial opposition from developers who had planned commercial projects on the same sites. In a public hearing, however, residents presented data showing that neighborhoods with gardens experienced 14% lower crime rates and 8% higher property values than comparable neighborhoods without them.',
    question: 'The author most likely includes the residents\' data in order to:',
    correct: 'provide evidence that community gardens offer concrete benefits beyond recreation.',
    wrong: [
      'argue that developers should be banned from building commercially.',
      'prove that the mayor\'s proposal was unpopular.',
      'suggest that crime rates depend solely on the presence of gardens.',
    ],
  },
  {
    passage:
      'Some psychologists caution against interpreting a single study as definitive proof. They point to the replication crisis in social science, noting that more than half of landmark findings failed to reproduce when tested by independent laboratories. These researchers do not dismiss original findings entirely but advocate for a cumulative evidence standard before policy recommendations are made.',
    question: 'The author mentions the replication crisis primarily to:',
    correct: 'explain why psychologists urge caution about drawing conclusions from individual studies.',
    wrong: [
      'prove that all psychological research is unreliable.',
      'criticize independent laboratories for producing flawed results.',
      'argue that policy should never be based on scientific evidence.',
    ],
  },
  {
    passage:
      'Jazz pianist Thelonious Monk was known for his dissonant chords and irregular rhythms, elements that initially alienated listeners accustomed to swing-era conventions. Over time, however, musicians came to recognize Monk\'s innovations as deliberate expansions of harmonic language rather than technical errors, and his compositions became standard repertoire in jazz education.',
    question: 'The author describes the initial reaction to Monk\'s music most likely in order to:',
    correct: 'contrast early misunderstanding with later recognition of Monk\'s intentional innovations.',
    wrong: [
      'suggest that Monk lacked formal musical training.',
      'argue that swing-era music was superior to Monk\'s compositions.',
      'prove that jazz education has declined in quality.',
    ],
  },
  {
    passage:
      'Proponents of year-round schooling argue that the traditional summer break causes low-income students to lose up to two months of reading progress, a phenomenon known as "summer slide." They point to districts in North Carolina and Indiana where year-round calendars reduced achievement gaps between income groups by 20% over five years. Critics, however, note that these districts also received additional per-pupil funding that may account for part of the improvement.',
    question: 'The author includes the critics\' response most likely to:',
    correct: 'acknowledge a limitation in the evidence supporting year-round schooling.',
    wrong: [
      'prove that year-round schooling is ineffective.',
      'argue that additional funding is always harmful to students.',
      'dismiss the concerns of low-income families.',
    ],
  },
  {
    passage:
      'The discovery of high concentrations of microplastics in Arctic sea ice initially puzzled researchers, since the region has no significant local sources of plastic pollution. Subsequent analysis revealed that ocean currents transport microplastics from industrialized coastlines thousands of miles away, where the particles become trapped as sea ice forms. The finding underscored that plastic pollution is not a localized problem but a global circulation issue.',
    question: 'The author mentions the initial puzzlement of researchers most likely to:',
    correct: 'highlight the unexpected nature of the finding and set up the explanation that follows.',
    wrong: [
      'suggest that the researchers were unqualified to study Arctic ice.',
      'argue that Arctic ice should not be a research priority.',
      'prove that microplastics are harmless in cold environments.',
    ],
  },
];

function purposeTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = PURPOSE_PASSAGES[randInt(rand, 0, PURPOSE_PASSAGES.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-reading',
    skill: 'rhetorical-purpose',
    difficulty: randInt(rand, 3, 5),
    stem: `${sample.passage}\n\n${sample.question}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Rhetorical purpose asks WHY the author included a detail, not WHAT it says.',
      `The detail serves to ${sample.correct.charAt(0).toLowerCase() + sample.correct.slice(1)}`,
      'Eliminate answers that describe what the text says rather than why.',
    ],
    strategy_tip: 'Ask "what job does this detail do in the argument?" not "what does it say?"',
    trap_tag: 'Confusing what a detail states with why the author included it.',
  });
}

// ── WRITING: Sentence Placement (NEW — high-value for 600→700) ──

const PLACEMENT_SETS = [
  {
    paragraph: '[1] The company launched a new recycling program. [2] Employees were given color-coded bins for paper, plastic, and glass. [3] Within three months, the office reduced landfill waste by 35%. [4] ____',
    sentence: 'To encourage participation, the sustainability team posted weekly progress charts in the break room.',
    correct: 'After sentence 2',
    wrong: ['After sentence 1', 'After sentence 3', 'Before sentence 1'],
    explanation: 'The sentence describes an action taken to boost participation, which logically follows the introduction of the bins (sentence 2) and precedes the result (sentence 3).',
  },
  {
    paragraph: '[1] Recent archaeological evidence suggests that ancient Polynesians navigated thousands of miles of open ocean using star patterns and wave currents. [2] ____ [3] These methods were passed orally from master navigators to apprentices over generations. [4] Modern sailors have confirmed the accuracy of these traditional techniques in controlled ocean crossings.',
    sentence: 'They also read subtle variations in cloud formations and bird flight paths to determine proximity to land.',
    correct: 'After sentence 1',
    wrong: ['After sentence 3', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The sentence adds another navigation method, logically continuing the list begun in sentence 1 before sentence 3 discusses how methods were taught.',
  },
  {
    paragraph: '[1] The clinic offered free flu vaccinations every October. [2] Nurses administered shots during extended evening hours to accommodate working families. [3] ____ [4] By January, the neighborhood\'s flu hospitalization rate had dropped to its lowest level in a decade.',
    sentence: 'Local pharmacies also distributed pamphlets in Spanish and Mandarin to reach non-English-speaking residents.',
    correct: 'After sentence 2',
    wrong: ['After sentence 1', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The sentence describes additional outreach efforts, which logically follows the scheduling accommodation (sentence 2) and precedes the result (sentence 4).',
  },
];

function placementTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = PLACEMENT_SETS[randInt(rand, 0, PLACEMENT_SETS.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'sentence-placement',
    difficulty: randInt(rand, 3, 5),
    stem: `Where should the following sentence be placed in the paragraph?\n\nSentence: "${sample.sentence}"\n\nParagraph:\n${sample.paragraph}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Check what comes before and after each possible position.',
      sample.explanation,
      `"${sample.correct}" creates the most logical flow.`,
    ],
    strategy_tip: 'Read the sentence with the one before and after it. It should flow in both directions.',
    trap_tag: 'Placing the sentence where it disrupts the cause-then-effect structure.',
  });
}

// ── WRITING: Possessives & Contractions (NEW — common 600-level trap) ──

const POSSESSIVE_SETS = [
  {
    stem: 'The researchers published ____ findings in a peer-reviewed journal.',
    correct: 'their',
    wrong: ["they're", 'there', "theirs'"],
    explanation: '"Their" is the possessive pronoun; "they\'re" means "they are" and "there" indicates place.',
  },
  {
    stem: '____ essential that every student complete the form before the deadline.',
    correct: "It's",
    wrong: ['Its', "Its'", 'Is'],
    explanation: '"It\'s" is the contraction for "it is." "Its" (no apostrophe) is possessive.',
  },
  {
    stem: 'The committee announced that ____ decision would be final.',
    correct: 'its',
    wrong: ["it's", "its'", "they're"],
    explanation: '"Its" is the possessive form. "It\'s" means "it is" and does not fit this context.',
  },
  {
    stem: 'The two ____ presentations were scheduled back to back.',
    correct: "students'",
    wrong: ["student's", 'students', "students's"],
    explanation: '"Students\'" is the plural possessive — the presentations belong to two students.',
  },
  {
    stem: '____ going to present the proposal at tomorrow\'s meeting.',
    correct: "Who's",
    wrong: ['Whose', "Whos'", 'Whom'],
    explanation: '"Who\'s" is the contraction for "who is." "Whose" is possessive and does not fit.',
  },
];

function possessiveTemplate(seed) {
  const rand = mulberry32(seed);
  const sample = POSSESSIVE_SETS[randInt(rand, 0, POSSESSIVE_SETS.length - 1)];
  const { choices, answerKey } = makeChoices(rand, sample.correct, sample.wrong);
  return buildQuestion({
    domain: 'verbal-writing',
    skill: 'possessives-contractions',
    difficulty: randInt(rand, 1, 3),
    stem: `Choose the word that correctly completes the sentence:\n\n${sample.stem}`,
    choices,
    answer_key: answerKey,
    explanation_steps: [
      'Determine whether the blank needs a possessive or a contraction.',
      sample.explanation,
      `"${sample.correct}" is the correct form.`,
    ],
    strategy_tip: 'Expand contractions mentally: if "it is" or "who is" fits, use the apostrophe version.',
    trap_tag: 'Confusing possessive pronouns with contractions (its vs it\'s, whose vs who\'s).',
  });
}

// ── Template Plan ──

const TEMPLATE_PLAN = [
  ['agreement', 45, agreementTemplate],
  ['punctuation', 42, punctuationTemplate],
  ['transition', 42, transitionTemplate],
  ['concision', 35, concisionTemplate],
  ['possessive', 30, possessiveTemplate],
  ['placement', 25, placementTemplate],
  ['main-idea', 40, mainIdeaTemplate],
  ['inference', 40, inferenceTemplate],
  ['vocab', 35, vocabTemplate],
  ['evidence', 35, evidenceTemplate],
  ['purpose', 35, purposeTemplate],
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

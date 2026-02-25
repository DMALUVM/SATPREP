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
  ['The jury', 'has', 'have'],
  ['Neither the teacher nor the students', 'were', 'was'],
  ['The stack of papers on the desk', 'needs', 'need'],
  ['Everyone in the two classes', 'is', 'are'],
  ['The pair of scissors', 'was', 'were'],
  ['The news from overseas', 'is', 'are'],
  ['A number of candidates', 'have', 'has'],
  ['The majority of the voters', 'support', 'supports'],
  ['Physics', 'is', 'are'],
  ['The board of directors', 'votes', 'vote'],
  ['Each of the volunteers', 'has', 'have'],
  ['The orchestra', 'performs', 'perform'],
  ['None of the equipment', 'was', 'were'],
  ['Both the principal and the vice principal', 'attend', 'attends'],
  ['The family of four', 'travels', 'travel'],
  ['Measles', 'is', 'are'],
  ['The number of applicants', 'has', 'have'],
  ['Every one of the contestants', 'receives', 'receive'],
  ['The herd of cattle', 'grazes', 'graze'],
  ['Either the students or the teacher', 'is', 'are'],
  ['The crew of the ship', 'works', 'work'],
  ['Mathematics', 'requires', 'require'],
  ['A variety of options', 'exists', 'exist'],
  ['The crowd of spectators', 'cheers', 'cheer'],
  ['Neither the dog nor the cats', 'were', 'was'],
  ['The economics of the proposal', 'makes', 'make'],
  ['Anybody in these groups', 'is', 'are'],
  ['The team of researchers', 'publishes', 'publish'],
  ['Five dollars', 'is', 'are'],
];

const AGREEMENT_CONTEXTS = [
  'every Friday to review progress.',
  'at the start of each quarter.',
  'before any final decisions are made.',
  'after the preliminary round ends.',
  'when the semester officially begins.',
  'during the annual planning session.',
  'at the regional conference each spring.',
  'whenever a new policy is proposed.',
  'before the budget deadline each October.',
  'on the first Monday of every month.',
  'after the results are officially posted.',
  'during the weekly staff briefing.',
  'as soon as the grant application closes.',
  'whenever the board convenes for review.',
  'throughout the duration of the trial.',
  'at the conclusion of the training program.',
  'when enrollment numbers are finalized.',
  'prior to the annual shareholders\' meeting.',
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
  ['The medication showed no side effects in trials', 'the FDA approved it for general use'],
  ['Voter turnout dropped in the primary election', 'the campaign shifted to digital outreach'],
  ['The bridge inspection revealed structural weaknesses', 'the city council allocated emergency repair funds'],
  ['The algorithm performed well on training data', 'it struggled with real-world inputs'],
  ['Attendance at the museum declined steadily', 'the board introduced free admission on weekends'],
  ['The experiment confirmed the original hypothesis', 'the researchers prepared a publication'],
  ['The drought reduced crop yields across the region', 'food prices rose sharply in local markets'],
  ['Student test scores improved after the curriculum change', 'the school district adopted it system-wide'],
  ['The company lost its largest client', 'leadership restructured the sales department'],
  ['Air quality worsened during the summer months', 'the city expanded its public transit routes'],
  ['The archaeological dig uncovered ancient pottery fragments', 'historians revised their timeline of settlement'],
  ['The vaccine rollout faced supply chain delays', 'health officials prioritized high-risk populations'],
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
  {
    sentence: 'The lab tested the compound on plant cells. ____ they observed a 40% increase in growth rate.',
    correct: 'As a result,',
    wrong: ['Nevertheless,', 'On the other hand,', 'For example,'],
  },
  {
    sentence: 'The old factory produced heavy pollution. ____ the new facility uses solar-powered equipment.',
    correct: 'In contrast,',
    wrong: ['Therefore,', 'Likewise,', 'Consequently,'],
  },
  {
    sentence: 'The team practiced six days a week. ____ they won the regional championship.',
    correct: 'Consequently,',
    wrong: ['However,', 'In contrast,', 'Similarly,'],
  },
  {
    sentence: 'Tuition increased by 8% this year. ____ enrollment remained at record levels.',
    correct: 'Nevertheless,',
    wrong: ['Therefore,', 'As a result,', 'Likewise,'],
  },
  {
    sentence: 'The first study used a sample of 50 participants. ____ the second study expanded to 2,000.',
    correct: 'By contrast,',
    wrong: ['Consequently,', 'For instance,', 'Similarly,'],
  },
  {
    sentence: 'The CEO announced record profits. ____ she credited the engineering team\'s efficiency improvements.',
    correct: 'Specifically,',
    wrong: ['However,', 'In contrast,', 'Nevertheless,'],
  },
  {
    sentence: 'Residents complained about traffic noise for years. ____ the city installed sound barriers along the highway.',
    correct: 'In response,',
    wrong: ['Similarly,', 'By contrast,', 'For instance,'],
  },
  {
    sentence: 'The sculptor used traditional bronze casting methods. ____ the painter experimented with digital media.',
    correct: 'On the other hand,',
    wrong: ['Therefore,', 'As a result,', 'Furthermore,'],
  },
  {
    sentence: 'The vaccine was 95% effective in clinical trials. ____ public health officials recommended widespread distribution.',
    correct: 'Accordingly,',
    wrong: ['However,', 'In contrast,', 'On the other hand,'],
  },
  {
    sentence: 'The policy reduced carbon emissions by 12%. ____ it also created 4,000 new jobs in renewable energy.',
    correct: 'Moreover,',
    wrong: ['However,', 'In contrast,', 'Nevertheless,'],
  },
  {
    sentence: 'Critics dismissed the film as derivative. ____ audiences gave it a 92% approval rating.',
    correct: 'Nonetheless,',
    wrong: ['Therefore,', 'Similarly,', 'For instance,'],
  },
  {
    sentence: 'The library lacked adequate funding for new books. ____ volunteers organized a community book drive.',
    correct: 'To address this,',
    wrong: ['Similarly,', 'In fact,', 'As a result,'],
  },
  {
    sentence: 'Plants need sunlight for photosynthesis. ____ cacti have adapted to thrive in intense desert sun.',
    correct: 'For example,',
    wrong: ['However,', 'In contrast,', 'Nevertheless,'],
  },
  {
    sentence: 'The initial hypothesis predicted a positive correlation. ____ the data revealed no significant relationship.',
    correct: 'However,',
    wrong: ['Therefore,', 'Consequently,', 'Similarly,'],
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
  {
    correct: 'The committee rejected the proposal.',
    wordy: [
      'The committee made the decision to reject the proposal that was submitted.',
      'It was the committee that chose to reject and turn down the proposal.',
      'The proposal was rejected by the committee after they decided against it.',
    ],
  },
  {
    correct: 'The architect redesigned the entrance.',
    wordy: [
      'The architect undertook the task of redesigning and changing the entrance.',
      'A redesign of the entrance was completed by the architect who worked on it.',
      'The entrance was redesigned by the architect in a new and different way.',
    ],
  },
  {
    correct: 'Volunteers planted trees along the highway.',
    wordy: [
      'Volunteers engaged in the activity of planting trees along the highway area.',
      'Trees were planted by volunteers along the side of the highway road.',
      'The volunteers who participated planted trees along the highway route path.',
    ],
  },
  {
    correct: 'The study measured air quality in three cities.',
    wordy: [
      'The study that was conducted measured the quality of the air in three cities.',
      'What the study did was measure how good the air quality was in three cities.',
      'Air quality measurements were taken by the study across three different cities.',
    ],
  },
  {
    correct: 'The company hired 200 new employees.',
    wordy: [
      'The company made the decision to hire and bring on 200 new employees.',
      'A total of 200 new employees were hired and brought on by the company.',
      'The company engaged in hiring 200 new employees to join the workforce.',
    ],
  },
  {
    correct: 'The governor signed the bill into law.',
    wordy: [
      'The governor put her signature on the bill, thereby signing it into law.',
      'It was the governor who signed the bill, making it an official law.',
      'The bill was signed into law by the governor who was in office.',
    ],
  },
  {
    correct: 'The experiment failed to produce consistent results.',
    wordy: [
      'The experiment that was run failed to produce results that were consistent.',
      'What happened was that the experiment did not produce consistent results.',
      'The results produced by the experiment were not consistent and it failed.',
    ],
  },
  {
    correct: 'The city expanded its recycling program.',
    wordy: [
      'The city took steps to expand and grow its existing recycling program.',
      'An expansion of the recycling program was carried out by the city.',
      'The recycling program that the city had was expanded to a larger scope.',
    ],
  },
  {
    correct: 'The author published her memoir last spring.',
    wordy: [
      'The author completed and published her memoir during the spring of last year.',
      'Last spring was the time when the author published her memoir book.',
      'A memoir was published by the author, and it came out last spring.',
    ],
  },
  {
    correct: 'The deadline was extended by two weeks.',
    wordy: [
      'The deadline was given an extension of an additional two weeks of time.',
      'An extension of two weeks was granted to the deadline that was set.',
      'The deadline that existed was pushed back and extended by two weeks.',
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
  {
    passage:
      'Traditional beekeeping assumed that honeybee colonies functioned best when left largely undisturbed. Recent research, however, shows that managed interventions — such as splitting overcrowded hives and rotating old comb — reduce disease prevalence and increase honey yields by up to 25%. Beekeepers who adopted these active management techniques reported fewer colony losses during winter, a period when unmanaged hives historically suffered mortality rates above 30%.',
    correct: 'Active hive management reduces disease, boosts yields, and lowers winter colony losses compared to hands-off approaches.',
    wrong: [
      'Honeybee colonies should never be disturbed by beekeepers.',
      'Winter colony losses have been eliminated by modern techniques.',
      'Traditional beekeeping produced higher honey yields than managed methods.',
    ],
  },
  {
    passage:
      'Microfinance was once hailed as a silver bullet for global poverty. Early studies from Bangladesh showed impressive results: borrowers started small businesses, increased household income, and sent more children to school. However, large-scale randomized trials conducted across six countries between 2009 and 2015 painted a more nuanced picture. While microloans did help some entrepreneurs, average income gains were modest, and borrowers in the poorest quintile sometimes took on unsustainable debt.',
    correct: 'Rigorous studies revealed that microfinance helps some borrowers but produces smaller and less universal benefits than initially believed.',
    wrong: [
      'Microfinance has been proven completely ineffective at reducing poverty.',
      'All borrowers in Bangladesh experienced lasting economic improvement.',
      'Randomized trials showed microloans were harmful in every country studied.',
    ],
  },
  {
    passage:
      'The concept of "blue zones" — regions where residents live disproportionately long lives — gained popularity after demographic studies identified five such areas worldwide. Researchers found that these populations share common lifestyle features: plant-heavy diets, daily physical activity integrated into routines rather than structured exercise, strong social networks, and a sense of purpose. Critics note that some blue zone data relied on birth records of questionable accuracy, but the lifestyle patterns have been independently linked to longevity in controlled studies.',
    correct: 'Blue zone populations share lifestyle habits linked to longevity, though some underlying demographic data has been questioned.',
    wrong: [
      'Blue zones exist on every continent and share identical diets.',
      'Structured exercise programs are the primary driver of blue zone longevity.',
      'Critics have definitively disproven all blue zone research.',
    ],
  },
  {
    passage:
      'Desalination plants convert seawater into fresh water, offering a seemingly unlimited supply for drought-prone regions. Yet the process remains energy-intensive: producing one cubic meter of drinking water requires roughly 3 to 5 kilowatt-hours. Newer membrane technologies have cut energy use by 40% compared to thermal methods, but brine discharge — the concentrated salt byproduct — poses environmental risks to marine ecosystems near outfall sites. Coastal cities must therefore weigh water security gains against ecological costs.',
    correct: 'Desalination provides drought relief but involves significant energy costs and environmental trade-offs from brine discharge.',
    wrong: [
      'Desalination is now energy-free thanks to membrane technology.',
      'Brine discharge has no measurable effect on marine life.',
      'All coastal cities have rejected desalination due to its costs.',
    ],
  },
  {
    passage:
      'Citizen science projects — in which volunteers collect data for professional researchers — have expanded dramatically with the rise of smartphone apps. Platforms like eBird and iNaturalist have generated millions of species observations that scientists use to track migration patterns and biodiversity loss. Although volunteer-collected data can contain identification errors, studies show that aggregating large volumes of observations statistically dilutes individual mistakes, making the datasets reliable enough for peer-reviewed ecological research.',
    correct: 'Citizen science platforms produce large, statistically reliable datasets despite occasional individual errors.',
    wrong: [
      'Citizen science data is too unreliable for any scientific use.',
      'Only professional researchers contribute observations to eBird.',
      'Smartphone apps have reduced participation in citizen science.',
    ],
  },
  {
    passage:
      'For decades, fire suppression was the default strategy for managing forests in the western United States. This approach allowed dense underbrush to accumulate, creating conditions for the catastrophic wildfires that have become increasingly common. Ecologists now advocate for prescribed burns — controlled fires set during cool, moist conditions — which clear excess fuel and promote the growth of fire-adapted species. Indigenous communities have practiced similar land management techniques for thousands of years, a fact that is reshaping how forestry agencies approach fire policy.',
    correct: 'Decades of fire suppression created dangerous fuel loads, and prescribed burns modeled on Indigenous practices offer a safer alternative.',
    wrong: [
      'Fire suppression has been the most effective forest management strategy.',
      'Prescribed burns are too dangerous to implement in any conditions.',
      'Indigenous fire practices have had no influence on modern forestry policy.',
    ],
  },
  {
    passage:
      'The gig economy promised workers flexibility and autonomy, but a growing body of labor research suggests these benefits come at a steep cost. Studies of ride-share and delivery drivers find that after accounting for vehicle depreciation, fuel, insurance, and self-employment taxes, median hourly earnings often fall below the local minimum wage. Meanwhile, platforms retain the ability to adjust pay algorithms without notice, leaving workers with little bargaining power over their effective compensation.',
    correct: 'Gig economy flexibility masks low net earnings and an imbalance of power between platforms and workers.',
    wrong: [
      'Gig workers consistently earn above minimum wage after expenses.',
      'Platforms cannot change pay algorithms once workers sign up.',
      'Labor researchers universally endorse the gig economy model.',
    ],
  },
  {
    passage:
      'Vertical farming — growing crops in stacked indoor layers under artificial light — has attracted billions in investment as a solution to urban food insecurity. Proponents highlight its year-round production, minimal water use, and elimination of pesticides. However, the electricity required for lighting and climate control makes vertical farm produce two to five times more expensive than conventional field-grown crops. Unless energy costs decline substantially, vertical farms may remain limited to high-value greens rather than staple crops like wheat or rice.',
    correct: 'Vertical farming offers environmental advantages but remains too energy-intensive to compete with field agriculture for staple crops.',
    wrong: [
      'Vertical farms have already replaced conventional agriculture in most cities.',
      'Vertical farming uses more water than traditional field farming.',
      'Energy costs are irrelevant to the viability of vertical farming.',
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
  {
    passage:
      'After a wildfire destroyed 60% of the forest canopy in a national park, researchers planted a mix of native species and monitored regrowth over five years. Plots planted with diverse species mixtures recovered canopy cover 30% faster than those planted with a single dominant species. The mixed plots also attracted a wider range of pollinators, which accelerated flowering plant reproduction throughout the recovering landscape.',
    correct: 'Planting diverse species mixtures after wildfire promotes faster forest recovery and greater ecological resilience.',
    wrong: [
      'Single-species planting is the preferred reforestation method.',
      'Pollinators avoided areas with mixed species plantings.',
      'The wildfire had no lasting impact on the forest canopy.',
    ],
  },
  {
    passage:
      'A school district replaced traditional letter grades with standards-based grading, where students receive scores on specific skills rather than a single overall grade. Teachers reported that students focused more on mastering individual skills and less on grade point averages. However, college admissions offices initially struggled to interpret the new transcripts, and several universities requested supplementary documentation from applicants.',
    correct: 'Standards-based grading shifted student focus toward skill mastery but created challenges for college admissions interpretation.',
    wrong: [
      'All universities immediately embraced standards-based transcripts.',
      'Students performed worse under the standards-based system.',
      'The district abandoned the new grading system within one year.',
    ],
  },
  {
    passage:
      'Noise pollution in oceans has increased steadily due to shipping, sonar, and offshore construction. Marine biologists found that humpback whales in noisy shipping lanes shortened their songs by an average of 29%, potentially reducing their ability to communicate mating signals across long distances. In contrast, whale populations in marine protected areas with speed restrictions on vessels maintained normal song lengths and displayed higher reproductive rates.',
    correct: 'Ocean noise pollution shortens whale communication, and vessel speed restrictions in protected areas help preserve natural behavior.',
    wrong: [
      'Humpback whales are unaffected by shipping noise.',
      'Marine protected areas had no effect on whale song patterns.',
      'Whale populations are increasing in busy shipping lanes.',
    ],
  },
  {
    passage:
      'An automotive manufacturer introduced a four-day work week at three factories as a pilot program. Productivity per worker-hour increased by 6%, and absenteeism dropped by 18%. Exit interviews from the control factories — which maintained five-day schedules — showed that employees cited work-life balance as the primary reason for leaving, a complaint absent from the pilot factories\' feedback.',
    correct: 'The four-day work week improved productivity and retention by addressing employees\' desire for better work-life balance.',
    wrong: [
      'Productivity declined at the pilot factories.',
      'Employees at the pilot factories reported worse work-life balance.',
      'The control factories experienced lower absenteeism.',
    ],
  },
  {
    passage:
      'Geologists analyzing ice cores from Greenland identified a layer of volcanic ash dating to approximately 536 CE, coinciding with historical records of an unusually cold summer across Europe. Tree ring data from that period shows the narrowest growth rings of the past two millennia, indicating severely reduced growing seasons. Historians have linked the resulting crop failures to famines and political upheaval that reshaped settlement patterns across the continent.',
    correct: 'A volcanic eruption around 536 CE caused climate cooling that triggered agricultural collapse and widespread social disruption in Europe.',
    wrong: [
      'The 536 CE cooling event had no effect on European agriculture.',
      'Tree ring data showed unusually wide growth rings during that period.',
      'Historians found that political stability increased after the crop failures.',
    ],
  },
  {
    passage:
      'Researchers studying bilingual children found that those who regularly switched between languages in conversation scored higher on tasks measuring cognitive flexibility — the ability to adapt thinking when rules change. Monolingual children performed equally well on tasks with fixed rules. The bilingual advantage was most pronounced in children who used both languages daily at home and school, rather than those exposed to a second language only in classroom settings.',
    correct: 'Regular, active bilingualism in daily life enhances cognitive flexibility more than limited classroom exposure.',
    wrong: [
      'Monolingual children outperformed bilingual children on all cognitive tasks.',
      'Classroom-only language exposure produced the strongest cognitive benefits.',
      'Bilingualism had no measurable effect on cognitive performance.',
    ],
  },
  {
    passage:
      'A hospital redesigned its intensive care unit to give each patient a private room with a window and sound insulation, replacing the traditional open ward layout. Patients in the new rooms required 15% fewer pain medications and were discharged an average of 1.2 days earlier. Nurses initially worried that private rooms would reduce their ability to monitor patients, but alarm systems and video feeds addressed those concerns without increasing staffing costs.',
    correct: 'Private ICU rooms with natural light reduced pain medication use and shortened hospital stays without compromising monitoring.',
    wrong: [
      'Patients in private rooms required more pain medication.',
      'The redesign significantly increased staffing costs.',
      'Nurses found that private rooms improved their monitoring ability.',
    ],
  },
  {
    passage:
      'Electric school buses cost roughly three times more than diesel buses upfront, but a Virginia school district that converted its fleet found that maintenance and fuel savings offset the higher purchase price within six years. Additionally, the district earned revenue by feeding stored battery power back into the electrical grid during peak demand hours, a practice known as vehicle-to-grid integration. Students on the electric buses reported fewer headaches and respiratory complaints.',
    correct: 'Electric school buses recover their higher upfront cost through savings and grid revenue while improving student health.',
    wrong: [
      'Diesel buses are cheaper to maintain than electric buses over time.',
      'Vehicle-to-grid integration increased the district\'s energy costs.',
      'Students reported no health differences between diesel and electric buses.',
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
  {
    sentence: 'The new policy was designed to mitigate the harmful effects of industrial runoff on local waterways.',
    target: 'mitigate',
    correct: 'reduce',
    wrong: ['increase', 'ignore', 'celebrate'],
  },
  {
    sentence: 'The diplomat\'s remarks were deliberately ambiguous, leaving both sides room to interpret them favorably.',
    target: 'ambiguous',
    correct: 'open to interpretation',
    wrong: ['hostile', 'precise', 'irrelevant'],
  },
  {
    sentence: 'After the scandal, the CEO worked to bolster public confidence in the company\'s leadership.',
    target: 'bolster',
    correct: 'strengthen',
    wrong: ['undermine', 'measure', 'question'],
  },
  {
    sentence: 'The biologist argued that the species\' decline was precipitated by habitat loss, not overhunting.',
    target: 'precipitated',
    correct: 'caused',
    wrong: ['prevented', 'predicted', 'prolonged'],
  },
  {
    sentence: 'The novel\'s protagonist was depicted as tenacious, refusing to abandon her goals despite repeated setbacks.',
    target: 'tenacious',
    correct: 'persistent',
    wrong: ['fragile', 'reckless', 'indifferent'],
  },
  {
    sentence: 'The editor noted that the article\'s tone was unduly harsh and suggested a more temperate approach.',
    target: 'temperate',
    correct: 'moderate',
    wrong: ['cold', 'tropical', 'aggressive'],
  },
  {
    sentence: 'The committee found the evidence to be inconclusive and called for further investigation.',
    target: 'inconclusive',
    correct: 'not definitive',
    wrong: ['overwhelming', 'fabricated', 'irrelevant'],
  },
  {
    sentence: 'Residents lauded the mayor for her transparent handling of the budget crisis.',
    target: 'lauded',
    correct: 'praised',
    wrong: ['criticized', 'ignored', 'questioned'],
  },
  {
    sentence: 'The researcher\'s findings corroborated the earlier study, lending weight to the original hypothesis.',
    target: 'corroborated',
    correct: 'confirmed',
    wrong: ['contradicted', 'complicated', 'replaced'],
  },
  {
    sentence: 'The company\'s decision to divest from fossil fuels was seen as a pragmatic response to shifting markets.',
    target: 'pragmatic',
    correct: 'practical',
    wrong: ['idealistic', 'reckless', 'emotional'],
  },
  {
    sentence: 'Critics described the playwright\'s dialogue as stilted, lacking the natural rhythm of everyday speech.',
    target: 'stilted',
    correct: 'stiff',
    wrong: ['elegant', 'humorous', 'poetic'],
  },
  {
    sentence: 'The professor was known for her exacting standards, requiring meticulous documentation from every student.',
    target: 'exacting',
    correct: 'demanding',
    wrong: ['lenient', 'unpredictable', 'inspiring'],
  },
  {
    sentence: 'The report characterized the drop in enrollment as precipitous, noting a 40% decline in just two years.',
    target: 'precipitous',
    correct: 'steep',
    wrong: ['gradual', 'expected', 'insignificant'],
  },
  {
    sentence: 'The architect\'s design was lauded for its ingenious use of natural light in an underground structure.',
    target: 'ingenious',
    correct: 'clever',
    wrong: ['expensive', 'conventional', 'controversial'],
  },
  {
    sentence: 'Despite the setback, the team remained sanguine about meeting the project deadline.',
    target: 'sanguine',
    correct: 'optimistic',
    wrong: ['angry', 'indifferent', 'anxious'],
  },
  {
    sentence: 'The journalist\'s account was meticulous, documenting every detail of the investigation over two years.',
    target: 'meticulous',
    correct: 'thorough',
    wrong: ['careless', 'biased', 'brief'],
  },
  {
    sentence: 'The speaker\'s remarks were so nebulous that audience members disagreed about her central argument.',
    target: 'nebulous',
    correct: 'vague',
    wrong: ['eloquent', 'hostile', 'detailed'],
  },
  {
    sentence: 'The new regulation was intended to curtail excessive logging in old-growth forests.',
    target: 'curtail',
    correct: 'limit',
    wrong: ['expand', 'monitor', 'encourage'],
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
  {
    passage:
      'A tech company implemented mandatory "no-meeting Wednesdays" to give employees uninterrupted focus time. Employee surveys showed that deep work output — measured by lines of code, reports completed, and designs finalized — increased by 22% on Wednesdays. Interestingly, Tuesday and Thursday productivity also rose by 8%, as employees better organized their collaborative work around the protected day.',
    question: 'Which detail best supports the claim that no-meeting days improved overall productivity?',
    correct: 'Tuesday and Thursday productivity also rose by 8% alongside the Wednesday gains.',
    wrong: [
      'The policy was mandatory rather than optional.',
      'The company measured deep work output.',
      'Employees completed collaborative work on other days.',
    ],
  },
  {
    passage:
      'A state increased its minimum teacher salary by 18%, funded through a reallocation of administrative spending. Over the next three years, teacher vacancy rates dropped by 35%, and the percentage of teachers with advanced degrees rose from 41% to 57%. Rural districts, which had previously struggled to attract candidates, saw the largest improvements in both retention and applicant quality.',
    question: 'Which evidence most directly supports the claim that higher pay attracted more qualified teachers?',
    correct: 'The percentage of teachers with advanced degrees rose from 41% to 57%.',
    wrong: [
      'The salary increase was funded by cutting administrative costs.',
      'The state raised salaries by 18%.',
      'Rural districts had previously struggled to attract candidates.',
    ],
  },
  {
    passage:
      'Researchers tested whether background music improved reading comprehension among college students. Students who read passages in silence scored an average of 82% on comprehension questions, while those who read with instrumental music scored 79%. Students who read with lyrical music scored only 68%. The researchers concluded that lyrics, not music itself, were the primary distraction.',
    question: 'Which finding best supports the researchers\' conclusion that lyrics were the main distraction?',
    correct: 'Students with instrumental music scored 79% while those with lyrical music scored only 68%.',
    wrong: [
      'Students in silence scored the highest overall.',
      'The study tested college students specifically.',
      'Comprehension was measured with questions after reading.',
    ],
  },
  {
    passage:
      'A city replaced 40% of its streetlights with motion-activated LED fixtures, which dim to 30% brightness when no movement is detected. Energy consumption for street lighting fell by 62% in the first year. Astronomers at a nearby observatory noted a measurable improvement in night sky visibility, and residents in neighborhoods with the new fixtures reported better sleep quality.',
    question: 'Which detail most directly supports the claim that the LED fixtures had environmental benefits beyond energy savings?',
    correct: 'Astronomers noted measurable improvement in night sky visibility.',
    wrong: [
      'Energy consumption fell by 62%.',
      'The fixtures dim to 30% when no movement is detected.',
      'The city replaced 40% of its streetlights.',
    ],
  },
  {
    passage:
      'A nonprofit distributed 10,000 water filters to households in rural Guatemala. Follow-up health surveys conducted six months later showed a 47% reduction in waterborne illness among children under five. Researchers noted that households where a community health worker demonstrated proper filter use had illness rates 60% lower than the regional average, compared to 35% lower among households that received filters without demonstration.',
    question: 'Which detail best supports the claim that health worker demonstrations increased filter effectiveness?',
    correct: 'Demonstrated households had 60% lower illness rates versus 35% for non-demonstrated households.',
    wrong: [
      '10,000 water filters were distributed.',
      'Surveys were conducted six months after distribution.',
      'The study focused on children under five.',
    ],
  },
  {
    passage:
      'A university dining hall replaced its standard trays with smaller plates to reduce food waste. Plate waste per meal decreased by 28%, and overall food purchases dropped by 15% without any reported increase in student complaints about portion size. The dining hall used the savings to source higher-quality ingredients from local farms, which student satisfaction surveys rated favorably.',
    question: 'Which evidence best supports the claim that smaller plates reduced food waste without harming satisfaction?',
    correct: 'Plate waste decreased 28% without any increase in complaints about portion size.',
    wrong: [
      'The dining hall switched to local farm ingredients.',
      'Food purchases dropped by 15%.',
      'Student satisfaction surveys were favorable.',
    ],
  },
  {
    passage:
      'A European airline began offering free train tickets to passengers for routes under 300 miles, replacing short-haul flights. Carbon emissions from the replaced routes dropped by 85%. Passenger satisfaction scores for the train segments were higher than for the flights they replaced, primarily because travelers could use electronic devices throughout the journey and spent less time in airport security lines.',
    question: 'Which detail best supports the claim that replacing flights with trains improved the passenger experience?',
    correct: 'Satisfaction scores for train segments were higher than for the flights they replaced.',
    wrong: [
      'Carbon emissions dropped by 85%.',
      'The airline offered free train tickets.',
      'Routes under 300 miles were replaced.',
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
  {
    passage:
      'The ancient Romans built aqueducts that transported water across hundreds of miles using only gravity. Engineers calculated precise gradients — typically a drop of about one foot per thousand feet of horizontal distance — to maintain steady flow without pumps. Some of these structures survived for centuries and continued supplying water to medieval towns long after the empire had fallen.',
    question: 'The author most likely includes the detail about precise gradients in order to:',
    correct: 'illustrate the engineering sophistication behind the aqueducts\' gravity-based design.',
    wrong: [
      'argue that modern plumbing is inferior to Roman technology.',
      'explain why the Roman Empire collapsed.',
      'suggest that aqueducts required frequent mechanical repairs.',
    ],
  },
  {
    passage:
      'Marie Curie faced enormous institutional resistance as a woman pursuing advanced physics in late 19th-century France. The Sorbonne had never granted a doctorate to a woman, and several prominent scientists initially dismissed her work on radioactivity as derivative. Curie\'s eventual Nobel Prize — she became the first person to win the award in two different sciences — vindicated both her research methodology and her perseverance.',
    question: 'The author describes the institutional resistance Curie faced most likely to:',
    correct: 'emphasize the magnitude of her achievement by showing the barriers she overcame.',
    wrong: [
      'argue that the Sorbonne should have closed its graduate programs.',
      'prove that Curie\'s research methods were flawed.',
      'suggest that Nobel Prizes should not be awarded in multiple fields.',
    ],
  },
  {
    passage:
      'Nutritionists once classified all dietary fats as harmful, advising consumers to minimize fat intake regardless of source. Subsequent research revealed crucial distinctions: unsaturated fats from olive oil, nuts, and fish actually reduce cardiovascular risk, while trans fats and excessive saturated fats increase it. This shift in understanding prompted the FDA to ban artificial trans fats from processed foods in 2018.',
    question: 'The author describes the earlier classification of all fats as harmful primarily to:',
    correct: 'show how scientific understanding evolved from an oversimplified view to a more nuanced one.',
    wrong: [
      'argue that nutritionists should not give dietary advice.',
      'prove that all fats are now considered healthy.',
      'suggest that the FDA acted prematurely in banning trans fats.',
    ],
  },
  {
    passage:
      'When the Mars rover Curiosity drilled into a rock formation in Gale Crater, it detected organic molecules — carbon-containing compounds that, on Earth, are typically associated with living organisms. NASA scientists were careful to note that the molecules could also have been produced by non-biological processes such as volcanic activity or meteorite impacts. The discovery nonetheless expanded the range of chemical environments where scientists will search for signs of past life.',
    question: 'The author includes NASA\'s cautionary note most likely to:',
    correct: 'prevent readers from prematurely concluding that life has been found on Mars.',
    wrong: [
      'undermine the significance of the Curiosity rover\'s findings.',
      'argue that organic molecules cannot exist on Mars.',
      'suggest that NASA doubts its own instruments\' accuracy.',
    ],
  },
  {
    passage:
      'In the early 2000s, economists predicted that automation would eliminate most manufacturing jobs within a decade. While assembly-line positions did decline sharply, the manufacturing sector unexpectedly created new roles in robotics maintenance, quality assurance, and systems integration. By 2020, total manufacturing employment had stabilized, though the skill requirements for the remaining jobs were substantially higher than before.',
    question: 'The author mentions the economists\' prediction most likely to:',
    correct: 'set up a contrast between what was expected and what actually occurred.',
    wrong: [
      'prove that economists are unreliable forecasters.',
      'argue that automation had no impact on manufacturing.',
      'suggest that manufacturing employment increased after 2000.',
    ],
  },
  {
    passage:
      'The Harlem Renaissance of the 1920s and 1930s is often celebrated for its literary achievements — the poetry of Langston Hughes, the novels of Zora Neale Hurston. Less frequently discussed is the movement\'s equally transformative impact on visual art. Artists like Aaron Douglas developed a distinctive style blending African motifs with modernist abstraction, creating murals and illustrations that became the visual vocabulary of a cultural awakening.',
    question: 'The author contrasts the literary and visual arts achievements of the Harlem Renaissance primarily to:',
    correct: 'draw attention to an underappreciated aspect of the movement.',
    wrong: [
      'argue that visual art was more important than literature during the period.',
      'suggest that Langston Hughes\'s poetry was overrated.',
      'prove that the Harlem Renaissance had no lasting cultural impact.',
    ],
  },
  {
    passage:
      'Ocean plastic cleanup devices have received significant media attention and philanthropic funding. Environmental scientists, however, point out that even the most ambitious removal projects capture less than 1% of annual plastic entering the oceans. These researchers argue that upstream interventions — reducing plastic production, improving waste management in developing countries, and redesigning packaging — would prevent far more pollution than downstream cleanup alone.',
    question: 'The author includes the scientists\' perspective most likely to:',
    correct: 'argue that prevention strategies deserve more emphasis than cleanup efforts.',
    wrong: [
      'prove that ocean cleanup technology is entirely useless.',
      'suggest that developing countries are solely responsible for ocean plastic.',
      'dismiss philanthropic funding for environmental causes.',
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
  {
    paragraph: '[1] The city council approved funding for a new public park. [2] ____ [3] Landscape architects designed walking trails and a community amphitheater. [4] The park opened to enthusiastic crowds the following spring.',
    sentence: 'An environmental assessment confirmed that the site posed no contamination risks.',
    correct: 'After sentence 1',
    wrong: ['After sentence 3', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The assessment logically occurs after funding approval and before design work begins.',
  },
  {
    paragraph: '[1] Solar panel installations in the state tripled between 2020 and 2024. [2] Government incentives covered up to 30% of installation costs. [3] ____ [4] As a result, the state met its renewable energy target two years ahead of schedule.',
    sentence: 'Utility companies also began offering net metering, allowing homeowners to sell excess electricity back to the grid.',
    correct: 'After sentence 2',
    wrong: ['After sentence 1', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The sentence adds another factor driving adoption, naturally following the incentives and preceding the result.',
  },
  {
    paragraph: '[1] ____ [2] The researcher collected water samples from twelve streams across the watershed. [3] Laboratory analysis revealed elevated levels of nitrogen and phosphorus in nine of the twelve sites. [4] The findings prompted the county to restrict fertilizer use within 200 feet of waterways.',
    sentence: 'Concerns about agricultural runoff contaminating local water sources had been growing for several years.',
    correct: 'Before sentence 1',
    wrong: ['After sentence 2', 'After sentence 3', 'After sentence 4'],
    explanation: 'The sentence provides background motivation that logically precedes the research described in sentence 2.',
  },
  {
    paragraph: '[1] The museum acquired a previously unknown manuscript attributed to a 16th-century monk. [2] Paleographers confirmed the handwriting matched other verified works by the same author. [3] ____ [4] The manuscript is now displayed in the museum\'s permanent medieval collection.',
    sentence: 'Carbon dating of the parchment placed its origin between 1530 and 1560, consistent with the monk\'s known lifetime.',
    correct: 'After sentence 2',
    wrong: ['After sentence 1', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The carbon dating provides additional authentication evidence, following the handwriting confirmation and preceding the display.',
  },
  {
    paragraph: '[1] Coral bleaching events have become more frequent as ocean temperatures rise. [2] During a bleaching event, corals expel the algae that provide them with both nutrients and color. [3] ____ [4] Marine biologists are now experimenting with heat-resistant algae strains that could help corals withstand warming waters.',
    sentence: 'If conditions do not improve within weeks, the weakened corals often die, leaving behind white calcium carbonate skeletons.',
    correct: 'After sentence 2',
    wrong: ['After sentence 1', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The sentence explains the consequence of bleaching, naturally following the description of the process and preceding the solution.',
  },
  {
    paragraph: '[1] The orchestra announced a new initiative to attract younger audiences. [2] Ticket prices for patrons under 30 were reduced by 50%. [3] Social media campaigns featured short rehearsal clips and musician interviews. [4] ____',
    sentence: 'Within one season, attendance among 18-to-29-year-olds had doubled.',
    correct: 'After sentence 3',
    wrong: ['After sentence 1', 'After sentence 2', 'Before sentence 1'],
    explanation: 'The result sentence logically follows all the initiatives described in sentences 2 and 3.',
  },
  {
    paragraph: '[1] The hospital introduced a rapid diagnostic test for bacterial infections. [2] ____ [3] Doctors could then prescribe targeted antibiotics within hours rather than days. [4] The new protocol reduced average hospital stays by 1.5 days and lowered rates of antibiotic resistance.',
    sentence: 'The test identified the specific bacterial strain from a single blood sample in under 90 minutes.',
    correct: 'After sentence 1',
    wrong: ['After sentence 3', 'After sentence 4', 'Before sentence 1'],
    explanation: 'The sentence explains how the test works, naturally following its introduction and preceding the clinical benefit.',
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
  {
    stem: 'The ____ uniform was left in the locker room after practice.',
    correct: "player's",
    wrong: ["players'", 'players', "player"],
    explanation: '"Player\'s" is singular possessive — the uniform belongs to one player.',
  },
  {
    stem: '____ no reason to postpone the vote any longer.',
    correct: "There's",
    wrong: ["Theirs", "Their's", "They're"],
    explanation: '"There\'s" is the contraction for "there is." The other options are possessive forms that do not fit.',
  },
  {
    stem: 'The ____ lounge is located on the third floor.',
    correct: "teachers'",
    wrong: ["teacher's", "teachers", "teacher"],
    explanation: '"Teachers\'" is plural possessive — the lounge belongs to all the teachers.',
  },
  {
    stem: '____ responsibility to ensure the data is accurate.',
    correct: "It's",
    wrong: ["Its", "Its'", "Is"],
    explanation: '"It\'s" contracts "it is" — "It is responsibility to..." fits the blank.',
  },
  {
    stem: 'The author ____ latest novel received critical acclaim.',
    correct: "whose",
    wrong: ["who's", "whom's", "whos"],
    explanation: '"Whose" is the possessive form of "who." "Who\'s" means "who is" and does not fit.',
  },
  {
    stem: 'Both ____ signatures are required on the contract.',
    correct: "partners'",
    wrong: ["partner's", "partners", "partner"],
    explanation: '"Partners\'" is plural possessive — the signatures belong to both partners.',
  },
  {
    stem: '____ been three years since the policy was implemented.',
    correct: "It's",
    wrong: ["Its", "Its'", "Is"],
    explanation: '"It\'s" contracts "it has" — "It has been three years..." fits the sentence.',
  },
  {
    stem: 'The ____ report was submitted ahead of schedule.',
    correct: "company's",
    wrong: ["companies'", "companys'", "companies"],
    explanation: '"Company\'s" is singular possessive — the report belongs to one company.',
  },
  {
    stem: '____ certain that the results will be published next month.',
    correct: "They're",
    wrong: ["Their", "There", "Theirs"],
    explanation: '"They\'re" contracts "they are" — "They are certain..." fits the blank.',
  },
  {
    stem: 'The three ____ artwork was displayed in the school gallery.',
    correct: "children's",
    wrong: ["childrens'", "childrens", "child's"],
    explanation: '"Children\'s" — "children" is already plural, so add \'s for the possessive.',
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
  ['agreement', 80, agreementTemplate],
  ['punctuation', 75, punctuationTemplate],
  ['transition', 75, transitionTemplate],
  ['concision', 60, concisionTemplate],
  ['possessive', 55, possessiveTemplate],
  ['placement', 45, placementTemplate],
  ['main-idea', 65, mainIdeaTemplate],
  ['inference', 65, inferenceTemplate],
  ['vocab', 60, vocabTemplate],
  ['evidence', 55, evidenceTemplate],
  ['purpose', 55, purposeTemplate],
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

export function getVerbalQuestionById(id) {
  return VERBAL_QUESTION_BANK.find((q) => q.id === id) || null;
}

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

const SEEN_KEY = 'satprep.seenQuestions.v1';

function loadSeenIds() {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.slice(-5000));
    return new Set();
  } catch { return new Set(); }
}

function saveSeenIds(seenSet) {
  try {
    const arr = [...seenSet].slice(-5000);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

function markSeen(items) {
  const seen = loadSeenIds();
  items.forEach((item) => {
    if (typeof item === 'string') { seen.add(item); return; }
    if (item?.id) seen.add(item.id);
    if (item?.canonical_id) seen.add(item.canonical_id);
  });
  saveSeenIds(seen);
}

function isSeen(seen, q) {
  if (seen.has(q.id)) return true;
  if (q.canonical_id && seen.has(q.canonical_id)) return true;
  return false;
}

function dedup(pool, minFresh = 0) {
  const seen = loadSeenIds();
  const unseen = pool.filter((q) => !isSeen(seen, q));
  if (unseen.length >= minFresh) return unseen;
  return [...unseen, ...pool.filter((q) => isSeen(seen, q))];
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

  pool = dedup(pool, count);
  const selected = shuffle(mulberry32(hashString(`${section}-${count}-${difficulty}-${Date.now()}`)), pool).slice(0, count);
  markSeen(selected);
  return selected;
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

  const weakPool = dedup(pool.filter((q) => weakSkillSet.has(q.skill)));
  const nonStrongPool = dedup(pool.filter((q) => !strongSkillSet.has(q.skill)));
  const maintenancePool = dedup(pool.filter((q) => strongSkillSet.has(q.skill)));

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

  const result = selected.slice(0, count);
  markSeen(result);
  return result;
}

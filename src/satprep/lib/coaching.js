function toSkillLabel(skill) {
  return String(skill || 'this skill').replace(/-/g, ' ');
}

function isTimedMode(mode) {
  return mode === 'timed' || mode === 'diagnostic';
}

export function classifyAttempt(question, review, mode = 'practice') {
  if (!question || !review) return 'insufficient-data';

  const baseTarget = Number(question.target_seconds || (String(question.domain || '').startsWith('verbal') ? 85 : 95));
  const targetSeconds = isTimedMode(mode) ? baseTarget : Math.round(baseTarget * 1.1);
  const spent = Number(review.secondsSpent || 0);

  if (review.isCorrect) {
    if (spent > targetSeconds * 1.2) return 'correct-but-slow';
    return 'strong-execution';
  }

  if (spent <= targetSeconds * 0.55) return 'time-panic';
  if (spent >= targetSeconds * 1.4) return 'concept-gap';
  return 'setup-error';
}

export function getMistakeTypeLabel(type) {
  switch (type) {
    case 'concept-gap':
      return 'Concept';
    case 'setup-error':
      return 'Setup';
    case 'time-panic':
      return 'Time';
    case 'correct-but-slow':
      return 'Pace';
    case 'strong-execution':
      return 'Strong';
    default:
      return 'Review';
  }
}

export function buildSocraticPrompts(question, attemptType) {
  const skill = toSkillLabel(question?.skill);
  const prompts = [
    `What exactly must the final answer include (value, form, and unit)?`,
    `Which ${skill} rule should be your first move?`,
  ];

  if (attemptType === 'concept-gap') {
    prompts.push('Where did your old attempt break first? Repair that step before moving on.');
    prompts.push('How can you prove the answer is reasonable in one quick check?');
    return prompts;
  }

  if (attemptType === 'setup-error') {
    prompts.push('Can you rewrite the setup line cleanly before doing any arithmetic?');
    prompts.push('Which sign, exponent, or variable placement is easiest to copy wrong here?');
    return prompts;
  }

  if (attemptType === 'time-panic') {
    prompts.push('What is the fastest valid path: direct formula, elimination, or calculator graph?');
    prompts.push('If you hit 90 seconds, which two choices can you eliminate immediately?');
    return prompts;
  }

  if (attemptType === 'correct-but-slow') {
    prompts.push('Where can you remove steps without increasing mistake risk?');
    prompts.push('Could Desmos or a cleaner setup cut at least 20 seconds?');
    return prompts;
  }

  prompts.push('What pattern let you solve this quickly?');
  prompts.push('How will you recognize this pattern in under 10 seconds next time?');
  return prompts;
}

export function buildCoachingPlan(question, review, mode = 'practice') {
  const attemptType = classifyAttempt(question, review, mode);
  const skill = toSkillLabel(question?.skill);
  const targetSeconds = Number(question?.target_seconds || (String(question?.domain || '').startsWith('verbal') ? 85 : 95));
  const spent = Number(review?.secondsSpent || 0);
  const timedMode = isTimedMode(mode);

  let coachFix = 'Review the solved steps and then repeat one clean rep at pace.';
  let nextAction = 'Do one similar question now and apply the same process.';
  let checklist = [
    'Name the target before solving.',
    'Run one clean setup line before calculations.',
    'Quick-check the result before submitting.',
  ];

  if (attemptType === 'concept-gap') {
    coachFix = `Rebuild ${skill} from fundamentals: list known values, choose the governing rule, then solve in sequence.`;
    nextAction = `Run a 3-question ${skill} rebuild set untimed, then 2 timed reps at <=${targetSeconds}s.`;
    checklist = [
      'State the rule/formula in words first.',
      'Write and solve one line at a time with no skipped logic.',
      'Verify by substitution or estimation before final answer.',
    ];
  } else if (attemptType === 'setup-error') {
    coachFix = 'Your setup line failed. Slow down at transcription and sign control before speeding up.';
    nextAction = 'Re-solve this exact question with setup focus, then do one near-variant immediately.';
    checklist = [
      'Copy givens exactly before manipulating.',
      'Circle negatives/exponents/fractions that can flip outcomes.',
      'Only compute after the setup line is correct.',
    ];
  } else if (attemptType === 'time-panic') {
    coachFix = 'You rushed into a low-quality attempt. Use a 20-second planning phase, then execute the fastest valid method.';
    nextAction = timedMode
      ? 'For the next 5 questions, enforce a hard 90-second cut rule: decide, eliminate, move.'
      : `Run a 6-question speed set in ${skill} with strict <=${targetSeconds}s pacing.`;
    checklist = [
      'First 20 seconds: choose strategy only.',
      'At 60 seconds: confirm you are still on a solvable path.',
      'At 90 seconds: eliminate and move if needed.',
    ];
  } else if (attemptType === 'correct-but-slow') {
    coachFix = 'Accuracy is on track. Now optimize sequence and tool choice to reduce time cost.';
    nextAction = 'Repeat one similar item and beat your time by at least 20 seconds while staying correct.';
    checklist = [
      'Choose method in under 10 seconds.',
      'Use calculator/algebra shortcuts where valid.',
      'Keep final check under 5 seconds.',
    ];
  } else if (attemptType === 'strong-execution') {
    coachFix = 'This is the standard. Keep it repeatable under timer pressure.';
    nextAction = 'Bank this pattern as mastered and move to your next weakest skill.';
    checklist = [
      'Keep the same efficient structure.',
      'Maintain target pacing with no extra steps.',
      'Transfer this pattern to harder variants.',
    ];
  }

  return {
    attemptType,
    mistakeLabel: getMistakeTypeLabel(attemptType),
    coachFix,
    nextAction,
    checklist,
    socraticPrompts: buildSocraticPrompts(question, attemptType),
    shouldGateSolution: !review?.isCorrect,
    targetSeconds,
    spentSeconds: spent,
  };
}

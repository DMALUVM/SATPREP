function roundMinutes(seconds) {
  return Math.max(1, Math.round(seconds / 60));
}

export function estimateSessionWindow({
  questions = [],
  timeLimitSeconds = 0,
  defaultSecondsPerQuestion = 95,
  minFactor = 0.9,
  maxFactor = 1.2,
}) {
  if (timeLimitSeconds > 0) {
    const exact = roundMinutes(timeLimitSeconds);
    return {
      minMinutes: exact,
      maxMinutes: exact,
      exactMinutes: exact,
      label: `${exact} min`,
    };
  }

  const baseSeconds = questions.length
    ? questions.reduce((sum, q) => sum + (Number(q.target_seconds) || defaultSecondsPerQuestion), 0)
    : defaultSecondsPerQuestion;

  const minMinutes = roundMinutes(baseSeconds * minFactor);
  const maxMinutes = Math.max(minMinutes, roundMinutes(baseSeconds * maxFactor));

  return {
    minMinutes,
    maxMinutes,
    exactMinutes: null,
    label: minMinutes === maxMinutes ? `${minMinutes} min` : `${minMinutes}-${maxMinutes} min`,
  };
}

export function estimateSessionFromConfig({ count = 10, difficulty = 'all', section = 'math' } = {}) {
  const perQuestionByDifficulty = {
    easy: section === 'verbal' ? 75 : 80,
    medium: section === 'verbal' ? 85 : 95,
    hard: section === 'verbal' ? 95 : 110,
    all: section === 'verbal' ? 85 : 95,
  };

  const secondsPerQuestion = perQuestionByDifficulty[difficulty] || perQuestionByDifficulty.all;
  const baseSeconds = count * secondsPerQuestion;
  const minMinutes = roundMinutes(baseSeconds * 0.9);
  const maxMinutes = Math.max(minMinutes, roundMinutes(baseSeconds * 1.2));
  return {
    minMinutes,
    maxMinutes,
    label: minMinutes === maxMinutes ? `${minMinutes} min` : `${minMinutes}-${maxMinutes} min`,
  };
}

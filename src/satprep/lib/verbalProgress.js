const KEY = 'satprep_verbal_progress_v1';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function emptyProgress() {
  return { sessions: [], skillMastery: {} };
}

export function getVerbalProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      skillMastery: parsed.skillMastery && typeof parsed.skillMastery === 'object' ? parsed.skillMastery : {},
    };
  } catch {
    return emptyProgress();
  }
}

export function saveVerbalProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress));
}

function updateSkillMastery(currentMastery, summary) {
  const next = { ...currentMastery };
  const skillBreakdown = summary.skillBreakdown || {};

  Object.entries(skillBreakdown).forEach(([skill, stats]) => {
    const prior = next[skill] || {
      attempts: 0,
      correct: 0,
      avgSeconds: 0,
      masteryScore: 50,
      lastSeenAt: null,
    };

    const newAttempts = prior.attempts + Number(stats.attempts || 0);
    const newCorrect = prior.correct + Number(stats.correct || 0);
    const weightedSeconds =
      (prior.avgSeconds * prior.attempts) + Number(stats.seconds || 0);
    const avgSeconds = newAttempts ? weightedSeconds / newAttempts : 0;
    const accuracy = newAttempts ? (newCorrect / newAttempts) * 100 : 0;
    const paceScore = clamp(100 - ((avgSeconds - 85) * 1.6), 25, 100);
    const masteryScore = clamp((accuracy * 0.75) + (paceScore * 0.25), 0, 100);

    next[skill] = {
      attempts: newAttempts,
      correct: newCorrect,
      avgSeconds: Number(avgSeconds.toFixed(2)),
      masteryScore: Number(masteryScore.toFixed(2)),
      lastSeenAt: new Date().toISOString(),
    };
  });

  return next;
}

export function recordVerbalSession(summary, config = {}) {
  const current = getVerbalProgress();
  const nextSessions = [
    {
      ...summary,
      ...config,
      created_at: new Date().toISOString(),
    },
    ...(current.sessions || []),
  ].slice(0, 160);

  const next = {
    sessions: nextSessions,
    skillMastery: updateSkillMastery(current.skillMastery || {}, summary),
  };

  saveVerbalProgress(next);
  return next;
}

function deriveSkillBands(skillMastery) {
  const rows = Object.entries(skillMastery || {}).map(([skill, stats]) => ({
    skill,
    attempts: Number(stats.attempts || 0),
    correct: Number(stats.correct || 0),
    avgSeconds: Number(stats.avgSeconds || 0),
    masteryScore: Number(stats.masteryScore || 0),
  }));

  rows.sort((a, b) => a.masteryScore - b.masteryScore);

  const weak = rows.filter((row) => row.attempts >= 4 && row.masteryScore < 70);
  const strong = rows.filter((row) => row.attempts >= 8 && row.masteryScore >= 85);

  return {
    weak,
    strong,
    all: rows,
  };
}

export function computeVerbalMetrics(progress = getVerbalProgress()) {
  const sessions = progress.sessions || [];
  const attempts = sessions.reduce((sum, s) => sum + Number(s.totalCount || 0), 0);
  const correct = sessions.reduce((sum, s) => sum + Number(s.correctCount || 0), 0);
  const accuracy = attempts ? (correct / attempts) * 100 : 0;
  const avgPace = attempts
    ? sessions.reduce((sum, s) => sum + Number(s.avgSeconds || 0) * Number(s.totalCount || 0), 0) / attempts
    : 0;

  const estimated = Math.round(
    clamp(430 + accuracy * 3 + Math.max(0, (95 - avgPace) * 2.1), 200, 800)
  );

  const skillBands = deriveSkillBands(progress.skillMastery || {});

  return {
    sessions: sessions.length,
    attempts,
    correct,
    accuracy: Number(accuracy.toFixed(1)),
    avgPace: Number(avgPace.toFixed(1)),
    estimatedVerbalScore: estimated,
    recent: sessions.slice(0, 8),
    skillRows: skillBands.all,
    weakSkills: skillBands.weak,
    strongSkills: skillBands.strong,
  };
}

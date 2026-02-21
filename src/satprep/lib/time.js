// Dynamic plan dates — derived from start date + test date
export let SAT_PLAN_START_DATE = '2026-02-22';
export let SAT_PLAN_END_DATE = '2026-03-11';
export let SAT_PLAN_WEEKS = 3;
export let SAT_PLAN_TOTAL_DAYS = 17;
export let SAT_TEST_DATE = '2026-03-11';

/**
 * Plan phases are proportional to total available days.
 * Each phase gets a name, a fraction of total days, and focus description.
 */
export let SAT_PLAN_PHASES = [];

function buildPhases(totalDays) {
  if (totalDays <= 7) {
    // 1 week or less — sprint mode
    return [
      { name: 'Sprint', fraction: 1.0, focus: 'Diagnostic + highest-impact weak skills + timed practice every session.' },
    ];
  }
  if (totalDays <= 14) {
    // 1-2 weeks — compressed
    return [
      { name: 'Foundation', fraction: 0.4, focus: 'Diagnostic, core cleanup, weak-skill drills, and pacing.' },
      { name: 'Pressure + Peak', fraction: 0.6, focus: 'Timed mixed sets, error tightening, simulations, and confidence execution.' },
    ];
  }
  if (totalDays <= 21) {
    // 2-3 weeks
    return [
      { name: 'Foundation', fraction: 0.3, focus: 'Diagnostic, core algebra cleanup, error pattern detection, and pacing discipline.' },
      { name: 'Acceleration', fraction: 0.35, focus: 'Weak-skill drills, medium-hard progression, and timed mixed sets.' },
      { name: 'Peak', fraction: 0.35, focus: 'Full simulations, error loop tightening, and confidence execution.' },
    ];
  }
  // 3-4+ weeks — full plan
  return [
    { name: 'Foundation', fraction: 0.25, focus: 'Diagnostic, core algebra cleanup, error pattern detection.' },
    { name: 'Acceleration', fraction: 0.25, focus: 'Weak-skill drills, medium-hard progression, and pacing discipline.' },
    { name: 'Pressure', fraction: 0.25, focus: 'Timed mixed sets, faster decisions, fewer stalls under clock.' },
    { name: 'Peak', fraction: 0.25, focus: 'Full simulations, error loop tightening, and confidence execution.' },
  ];
}

function assignPhaseDays(phases, totalDays) {
  let assigned = 0;
  return phases.map((phase, i) => {
    const isLast = i === phases.length - 1;
    const days = isLast ? totalDays - assigned : Math.max(1, Math.round(phase.fraction * totalDays));
    assigned += days;
    return { ...phase, days, startDay: assigned - days + 1, endDay: assigned };
  });
}

/**
 * Set plan dates from a start date and test date.
 * Falls back to start + plan_weeks if no test date provided.
 */
export function setPlanDates(startDate, testDateOrWeeks) {
  if (!startDate) return;
  SAT_PLAN_START_DATE = startDate;

  // Determine if we received a test date (YYYY-MM-DD) or a week count
  const isTestDate = typeof testDateOrWeeks === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(testDateOrWeeks);
  const isWeekCount = typeof testDateOrWeeks === 'number' || (typeof testDateOrWeeks === 'string' && /^[34]$/.test(testDateOrWeeks));

  if (isTestDate) {
    SAT_TEST_DATE = testDateOrWeeks;
    SAT_PLAN_END_DATE = testDateOrWeeks;
    SAT_PLAN_TOTAL_DAYS = Math.max(1, diffDays(startDate, testDateOrWeeks));
    SAT_PLAN_WEEKS = Math.max(1, Math.ceil(SAT_PLAN_TOTAL_DAYS / 7));
  } else if (isWeekCount) {
    const weeks = [3, 4].includes(Number(testDateOrWeeks)) ? Number(testDateOrWeeks) : 4;
    SAT_PLAN_WEEKS = weeks;
    SAT_PLAN_TOTAL_DAYS = weeks * 7;
    const end = new Date(`${startDate}T00:00:00`);
    end.setDate(end.getDate() + SAT_PLAN_TOTAL_DAYS - 1);
    SAT_PLAN_END_DATE = toDateKey(end);
    SAT_TEST_DATE = SAT_PLAN_END_DATE;
  } else {
    // Default: 4 weeks
    SAT_PLAN_WEEKS = 4;
    SAT_PLAN_TOTAL_DAYS = 28;
    const end = new Date(`${startDate}T00:00:00`);
    end.setDate(end.getDate() + 27);
    SAT_PLAN_END_DATE = toDateKey(end);
    SAT_TEST_DATE = SAT_PLAN_END_DATE;
  }

  const rawPhases = buildPhases(SAT_PLAN_TOTAL_DAYS);
  SAT_PLAN_PHASES = assignPhaseDays(rawPhases, SAT_PLAN_TOTAL_DAYS);
}

export function toDateKey(value = new Date()) {
  // Use local time so "today" matches the student's actual day, not UTC
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function diffDays(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const utcStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const utcEnd = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((utcEnd - utcStart) / 86400000);
}

export function getPlanDay(dateKey = toDateKey()) {
  return diffDays(SAT_PLAN_START_DATE, dateKey) + 1;
}

/**
 * Get the current phase for a given plan day.
 */
export function getPhaseForDay(day) {
  if (!SAT_PLAN_PHASES.length) return null;
  for (const phase of SAT_PLAN_PHASES) {
    if (day >= phase.startDay && day <= phase.endDay) return phase;
  }
  // Past end — return last phase
  return SAT_PLAN_PHASES[SAT_PLAN_PHASES.length - 1];
}

export function getWeekForDay(day) {
  return Math.max(1, Math.ceil(day / 7));
}

export function friendlyDate(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Initialize default phases
setPlanDates(SAT_PLAN_START_DATE, SAT_TEST_DATE);

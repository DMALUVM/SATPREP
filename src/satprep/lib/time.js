// Default dates — overridden per-user via profile.sat_start_date
export let SAT_PLAN_START_DATE = '2026-02-22';
export let SAT_PLAN_END_DATE = '2026-03-21';

export function setPlanDates(startDate) {
  if (!startDate) return;
  SAT_PLAN_START_DATE = startDate;
  // 28-day plan
  const start = new Date(`${startDate}T00:00:00`);
  start.setDate(start.getDate() + 27);
  SAT_PLAN_END_DATE = toDateKey(start);
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

export function getWeekForDay(day) {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
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

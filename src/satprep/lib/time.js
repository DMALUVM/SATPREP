export const SAT_PLAN_START_DATE = '2026-02-22';
export const SAT_PLAN_END_DATE = '2026-03-21';

export function toDateKey(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
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

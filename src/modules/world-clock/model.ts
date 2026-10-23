import { addDays, utcOffsetMinutes } from '@/shared/lib/time';

/** Город для часов. */
export type ClockCity = { slug: string; name: string; timezone: string };

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

/** На сколько минут время в `to` впереди времени в `from` (отрицательное — позади). */
export function zoneDifference(from: string, to: string, at: Date): number {
  return utcOffsetMinutes(to, at) - utcOffsetMinutes(from, at);
}

/** «+7 ч», «−1 ч», «+2 ч 30 мин», «то же время». */
export function formatDifference(minutes: number): string {
  if (minutes === 0) return 'то же время';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return `${sign}${[hours ? `${hours} ч` : '', rest ? `${rest} мин` : ''].filter(Boolean).join(' ')}`;
}

/**
 * Сетка месяца для календаря: недели с понедельника, даты `YYYY-MM-DD`,
 * дни соседних месяцев — null.
 */
export function monthGrid(month: string): Array<Array<string | null>> {
  const first = `${month}-01`;
  // День недели первого числа: 0 — понедельник … 6 — воскресенье.
  const shift = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const days: Array<string | null> = Array.from({ length: shift }, () => null);
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) days.push(date);
  while (days.length % 7 !== 0) days.push(null);
  return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
}

/** «Октябрь 2026». */
export function monthTitle(month: string): string {
  const title = new Date(`${month}-15T12:00:00Z`).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (title.charAt(0).toUpperCase() + title.slice(1)).replace(/\s*г\.$/, '');
}

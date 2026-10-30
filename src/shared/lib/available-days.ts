import { daysBetween } from './time';

/**
 * Дни, в которые есть рейсы: период и дни недели. По ним поле даты ограничивает выбор
 * (min и max), а подсказка говорит, по каким дням летаем. Даты — строки `YYYY-MM-DD`,
 * дни недели — 1 (понедельник) … 7 (воскресенье).
 */
export type DaySpan = { first: string; last: string; weekdays: number[] };

export const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

/** Общий период нескольких маршрутов: от самого раннего до самого позднего, дни — все вместе. */
export function mergeDaySpans(spans: DaySpan[]): DaySpan | null {
  const [head, ...rest] = spans;
  if (!head) return null;
  const weekdays = new Set(head.weekdays);
  let { first, last } = head;
  for (const span of rest) {
    if (span.first < first) first = span.first;
    if (span.last > last) last = span.last;
    for (const day of span.weekdays) weekdays.add(day);
  }
  return { first, last, weekdays: [...weekdays].sort((a, b) => a - b) };
}

/** «каждый день» или «по пн, ср, пт». */
export function weekdaysLabel(weekdays: number[]): string {
  const days = [...new Set(weekdays)].filter((day) => day >= 1 && day <= 7).sort((a, b) => a - b);
  if (days.length === 7) return 'каждый день';
  return `по ${days.map((day) => WEEKDAY_SHORT[day - 1]).join(', ')}`;
}

/**
 * Ближайшие к периоду [start; end] даты из списка — для ссылок «Ближайшие рейсы», когда
 * в выбранные даты ничего нет. Возвращаются по порядку дат.
 */
export function nearestDates(dates: string[], start: string, end: string, limit = 3): string[] {
  const distance = (date: string) =>
    date < start ? daysBetween(date, start) : date > end ? daysBetween(end, date) : 0;
  return [...new Set(dates)]
    .sort((a, b) => distance(a) - distance(b) || a.localeCompare(b))
    .slice(0, limit)
    .sort();
}

/**
 * Работа с местным временем городов без сторонних библиотек: через встроенный Intl.
 * Время храним в UTC (timestamptz), а задаём и показываем — в часовом поясе аэропорта.
 * Даты передаются строками `YYYY-MM-DD`, время — `HH:MM`.
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{2}):(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(at: Date, timeZone: string) {
  const parts = formatterFor(timeZone).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Смещение часового пояса от UTC в миллисекундах в данный момент (Москва: +3 ч). */
function offsetMs(at: Date, timeZone: string): number {
  const p = zonedParts(at, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

function parseDate(date: string): [number, number, number] {
  const match = DATE.exec(date);
  if (!match) throw new Error(`Дата должна быть в формате YYYY-MM-DD: «${date}»`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Местные дата и время в городе → момент в UTC. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = parseDate(date);
  const match = TIME.exec(time);
  if (!match) throw new Error(`Время должно быть в формате HH:MM: «${time}»`);

  const naive = Date.UTC(year, month - 1, day, Number(match[1]), Number(match[2]));
  // Смещение берём дважды: если на этот день приходится переход на летнее время,
  // второй расчёт его учтёт.
  const first = naive - offsetMs(new Date(naive), timeZone);
  const second = naive - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

/** Какое сейчас число в городе: в 01:30 по Москве в UTC ещё вчера. */
export function dateInZone(at: Date, timeZone: string): string {
  const p = zonedParts(at, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Местное время в городе: `HH:MM`. */
export function timeInZone(at: Date, timeZone: string): string {
  const p = zonedParts(at, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Сутки в городе как промежуток UTC: [начало, конец). */
export function zonedDayRange(date: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(date, '00:00', timeZone),
    end: zonedTimeToUtc(addDays(date, 1), '00:00', timeZone),
  };
}

/** Прибавляет дни к дате `YYYY-MM-DD` (можно отрицательные). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = parseDate(date);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/** Сколько дней от одной даты до другой. */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = parseDate(from);
  const [y2, m2, d2] = parseDate(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Смещение пояса от UTC для подписи: «UTC+3», «UTC+5:30», «UTC» (в данный момент). */
export function utcOffsetLabel(timeZone: string, at: Date = new Date()): string {
  const minutes = Math.round(offsetMs(at, timeZone) / 60_000);
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${rest ? `:${pad(rest)}` : ''}`;
}

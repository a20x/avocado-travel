import { z } from 'zod';
import { addDays } from '@/shared/lib/time';

/** Цифры счётчика в подвале (требование 30 методички: всего, сегодня, посетителей сегодня). */
export type Counters = { viewsTotal: number; viewsToday: number; visitorsToday: number };

export type Totals = { views: number; visitors: number };

export type StatsReport = {
  period: { from: string; to: string };
  today: Totals;
  inPeriod: Totals;
  allTime: Totals;
  /** Дни периода по порядку, дни без просмотров — с нулями. */
  byDay: Array<{ date: string } & Totals>;
  bySection: Array<{ section: string } & Totals>;
  referrers: Array<{ host: string; views: number }>;
  recent: Array<{ createdAt: Date; path: string; referrerHost: string | null }>;
};

/** Разделы сайта — первая часть адреса. */
export const SECTION_LABELS: Record<string, string> = {
  home: 'Главная',
  flights: 'Рейсы',
  booking: 'Бронирование',
  destinations: 'Направления',
  airlines: 'Авиакомпании',
  news: 'Новости',
  forum: 'Форум',
  guestbook: 'Гостевая книга',
  account: 'Личный кабинет',
  login: 'Вход',
  register: 'Регистрация',
  services: 'Сервисы',
  weather: 'Погода',
  press: 'Пресс-центр',
  analytics: 'Аналитика',
  links: 'Полезные ссылки',
  help: 'Справка',
  search: 'Поиск по сайту',
  other: 'Другие адреса',
};

/** Служебные адреса не считаются: админка, API и страницы разработчика. */
const UNTRACKED = ['/admin', '/api', '/dev', '/_next'];

/** Адрес без параметров и якоря, без завершающей косой черты. */
export function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0] ?? '/';
  return clean.length > 1 ? clean.replace(/\/+$/, '') || '/' : '/';
}

export function isTrackedPath(path: string): boolean {
  return !UNTRACKED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * `/news/kazan` → `news`, `/` → `home`. Неизвестный раздел (опечатка в адресе, страница 404,
 * выдуманный адрес в запросе к счётчику) — `other`, чтобы отчёт не засорялся.
 */
export function sectionOf(path: string): string {
  const section = normalizePath(path).split('/')[1] || 'home';
  return Object.hasOwn(SECTION_LABELS, section) ? section : 'other';
}

/**
 * Откуда пришли: хост внешней страницы без `www.`. Переходы внутри сайта, пустой
 * и непонятный адрес — null.
 */
export function referrerHost(referrer: string | undefined, siteHost: string | null): string | null {
  if (!referrer) return null;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const own = siteHost
    ?.toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^www\./, '');
  return host && host !== own ? host : null;
}

const SEARCH_ENGINES = [
  /(^|\.)yandex\.[a-z]+$/,
  /^ya\.ru$/,
  /(^|\.)google\.[a-z.]+$/,
  /(^|\.)bing\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /^go\.mail\.ru$/,
];

/** Переход из поисковой системы (требование 25 методички: «поисковые системы»). */
export function isSearchEngine(host: string): boolean {
  return SEARCH_ENGINES.some((pattern) => pattern.test(host));
}

/** Поисковые роботы и программы-проверяльщики — не посетители. */
export function isBot(userAgent: string | null): boolean {
  return (
    !userAgent || /bot|crawl|spider|slurp|facebookexternalhit|preview|curl|wget/i.test(userAgent)
  );
}

/** Что присылает браузер при открытии страницы. */
export const hitInputSchema = z.object({
  path: z.string().startsWith('/').max(500).transform(normalizePath),
  referrer: z.string().max(2000).optional(),
});
export type HitInput = z.infer<typeof hitInputSchema>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_PERIOD_DAYS = 366;

/**
 * Период отчёта из адреса `?from=…&to=…`. Без дат или с ошибкой — последние 30 дней.
 * Даты меняются местами, если перепутаны; период не длиннее года.
 */
export function parsePeriod(
  params: { from?: unknown; to?: unknown },
  today: string,
): { from: string; to: string } {
  const valid = (value: unknown) =>
    typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(value))
      ? value
      : null;
  let to = valid(params.to) ?? today;
  let from = valid(params.from) ?? addDays(to, -29);
  if (from > to) [from, to] = [to, from];
  if (to > today) to = today;
  if (from > to) from = to;
  const earliest = addDays(to, -(MAX_PERIOD_DAYS - 1));
  return { from: from < earliest ? earliest : from, to };
}

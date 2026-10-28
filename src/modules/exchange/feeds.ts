import { z } from 'zod';

/**
 * Внешние ленты «Новостей отрасли» (L4-05, docs/05-api.md). Список хранится в базе
 * (таблица external_feeds): администратор подключает и удаляет ленты на вкладке «RSS».
 * Формат выбирают чужие сайты: RSS 2.0, RSS 1.0 или Atom.
 */
export type ExternalFeed = {
  /** Короткий код — сохраняется в новости как `external_feed`. */
  id: string;
  /** Название источника — показывается у новости. */
  name: string;
  url: string;
  /** Рубрика импортированных новостей. */
  category: IndustryCategory;
};

/** Лента со сведениями о последнем импорте — для списка на вкладке «RSS». */
export type ExternalFeedStatus = ExternalFeed & {
  checkedAt: Date | null;
  lastError: string | null;
  lastAdded: number;
  /** Сколько новостей ленты сейчас на сайте. */
  newsCount: number;
};

export const INDUSTRY_CATEGORIES = {
  aviation: 'Авиация',
  travel: 'Туризм',
} as const;
export type IndustryCategory = keyof typeof INDUSTRY_CATEGORIES;

/** Больше лент не подключить: каждая импортируется по расписанию и замедляет задание. */
export const MAX_FEEDS = 10;

/** Новая лента из формы администратора. */
export const feedInputSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500, 'Адрес длиннее 500 символов')
    .pipe(
      z.url({
        protocol: /^https?$/,
        error: 'Нужен адрес ленты, начинающийся с http:// или https://',
      }),
    ),
  name: z.string().trim().min(2, 'Название — от 2 символов').max(80, 'Название — до 80 символов'),
  category: z.enum(Object.keys(INDUSTRY_CATEGORIES) as [IndustryCategory, ...IndustryCategory[]], {
    error: 'Выберите рубрику',
  }),
});
export type FeedInput = z.infer<typeof feedInputSchema>;

/**
 * Код новой ленты из адреса: «https://www.tourdom.ru/rss/» → «tourdom-ru». Занятый код
 * получает номер: «tourdom-ru-2».
 */
export function feedIdFor(url: string, taken: string[]): string {
  const base =
    new URL(url).hostname
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'feed';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Адрес из внутренней сети: localhost, частные диапазоны, link-local, служебные. Сервер
 * не должен скачивать «ленту» оттуда — иначе через форму можно заглянуть внутрь хостинга (SSRF).
 */
export function isPrivateAddress(address: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) {
    const [a = 0, b = 0] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (address.includes(':')) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)?.[1];
    if (mapped) return isPrivateAddress(mapped);
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb') ||
      lower.startsWith('ff')
    );
  }
  return true;
}

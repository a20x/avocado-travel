import { z } from 'zod';
import type { CombinedNewsItem } from './combined';
import { htmlToText, mentionsRealAirline, normalizeLink, summarize } from './industry';
import type { FeedItem } from './rss';

/**
 * Объединённые новости по введённой ленте (замечание преподавателя по лабе 4): посетитель вводит
 * адрес любой ленты RSS или Atom, сайт скачивает её, делит на записи и показывает их вместе
 * с новостями сайта из базы — одной страницей, по дате. Лента никуда не сохраняется.
 */

/** Сколько записей введённой ленты и новостей сайта показываем. */
export const MERGED_FEED_ITEMS = 30;
export const MERGED_SITE_ITEMS = 20;

/** Адрес ленты из формы: http(s), не длиннее 500 символов. */
export const feedUrlSchema = z
  .string()
  .trim()
  .min(1, 'Введите адрес ленты.')
  .max(500, 'Адрес длиннее 500 символов.')
  .pipe(
    z.url({
      protocol: /^https?$/,
      error: 'Нужен адрес вида https://example.com/rss.xml.',
    }),
  );

/** Подпись источника — сайт ленты без «www.»: «example.com». */
export function feedSourceName(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export type FeedPreviewReport = {
  items: CombinedNewsItem[];
  /** Сколько записей пропущено: без заголовка или ссылки, или про настоящие авиакомпании. */
  skippedInvalid: number;
  skippedAirline: number;
};

/**
 * Записи ленты — в формат общей ленты: текст без HTML, краткое описание, дата (нет даты или она
 * из будущего — «сейчас»). Записи про настоящие авиакомпании не показываются, как и при импорте:
 * авиакомпании на сайте выдуманные.
 */
export function feedItemsToNews(
  items: FeedItem[],
  source: string,
  now: Date,
  limit = MERGED_FEED_ITEMS,
): FeedPreviewReport {
  const report: FeedPreviewReport = { items: [], skippedInvalid: 0, skippedAirline: 0 };
  for (const item of items) {
    if (report.items.length >= limit) break;
    const title = htmlToText(item.title);
    const link = normalizeLink(item.link);
    if (!title || !link) {
      report.skippedInvalid++;
      continue;
    }
    const summary = summarize(htmlToText(item.description));
    if (mentionsRealAirline(`${title} ${summary}`)) {
      report.skippedAirline++;
      continue;
    }
    const publishedAt =
      item.publishedAt && item.publishedAt.getTime() <= now.getTime() ? item.publishedAt : now;
    report.items.push({
      id: link,
      title: summarize(title, 200),
      summary,
      category: 'Внешняя лента',
      source,
      url: link,
      publishedAt,
      isExternal: true,
    });
  }
  return report;
}

/**
 * Новости сайта и записи ленты в одном списке по убыванию дат (замечание преподавателя
 * одногруппнику, Этап 12): внутренние и внешние — вместе, от новых к старым. Одно время —
 * первой новость сайта, затем по заголовку, чтобы порядок не зависел от случая.
 */
export function mergeNews(site: CombinedNewsItem[], feed: CombinedNewsItem[]): CombinedNewsItem[] {
  return [...site, ...feed].sort(
    (a, b) =>
      b.publishedAt.getTime() - a.publishedAt.getTime() ||
      Number(a.isExternal) - Number(b.isExternal) ||
      a.title.localeCompare(b.title, 'ru'),
  );
}

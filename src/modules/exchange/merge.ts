import { z } from 'zod';
import { mixRank, type CombinedNewsItem } from './combined';
import { htmlToText, mentionsRealAirline, normalizeLink, summarize } from './industry';
import type { FeedItem } from './rss';

/**
 * Объединённые новости по введённой ленте (замечание преподавателя по лабе 4): посетитель вводит
 * адрес любой ленты RSS или Atom, сайт скачивает её, делит на записи и показывает их вперемешку
 * с новостями сайта из базы — обычной страницей. Лента никуда не сохраняется.
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

const newestFirst = (a: CombinedNewsItem, b: CombinedNewsItem) =>
  b.publishedAt.getTime() - a.publishedAt.getTime();

/**
 * Новости сайта и записи ленты в одном списке — тем же порядком «вперемешку», что и общая лента
 * вкладки: в каждых пяти записях две новости сайта и три из ленты, внутри групп — от новых
 * к старым, при равенстве первой идёт новость сайта.
 */
export function mergeNews(site: CombinedNewsItem[], feed: CombinedNewsItem[]): CombinedNewsItem[] {
  const ranked = [
    ...[...site]
      .sort(newestFirst)
      .map((item, index) => ({ item, rank: mixRank(true, index), site: 0 })),
    ...[...feed]
      .sort(newestFirst)
      .map((item, index) => ({ item, rank: mixRank(false, index), site: 1 })),
  ];
  return ranked.sort((a, b) => a.rank - b.rank || a.site - b.site).map(({ item }) => item);
}

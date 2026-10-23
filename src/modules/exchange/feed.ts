import type { News } from '@/modules/news';

/** Сколько новостей в ленте: читалкам нужны свежие, архив — в API и на сайте. */
export const FEED_SIZE = 20;

/**
 * Лента новостей сайта в формате JSON Feed 1.1 (https://www.jsonfeed.org/version/1.1/) —
 * JSON-аналог RSS (L4-02). Адреса — абсолютные: читалка не знает, с какого сайта пришла лента.
 */
export function buildFeed(items: News[], siteUrl: string) {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Новости Avocado Travel',
    home_page_url: `${siteUrl}/news`,
    feed_url: `${siteUrl}/feed.json`,
    description: 'Новые направления, акции и изменения в сервисе Avocado Travel.',
    language: 'ru',
    icon: `${siteUrl}/images/brand/apple-touch-icon.png`,
    favicon: `${siteUrl}/images/brand/favicon.svg`,
    authors: [{ name: 'Avocado Travel', url: siteUrl }],
    items: items.map((item) => {
      const url = `${siteUrl}/news/${item.slug}`;
      return {
        id: url,
        url,
        title: item.title,
        summary: item.summary,
        content_text: item.body,
        date_published: item.publishedAt.toISOString(),
        date_modified: item.updatedAt.toISOString(),
        tags: [item.category, ...item.tags],
      };
    }),
  };
}

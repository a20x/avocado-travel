import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { listCities } from '@/modules/catalog-data/server';
import { topicHref } from '@/modules/forum';
import { listTopicLinks } from '@/modules/forum/server';
import { listNewsLinks } from '@/modules/news/server';
import { SITE_URL } from '@/shared/config/site';

/**
 * Разделы сайта для поисковиков. Кабинет, бронь, вход и админка закрыты от индексации,
 * результаты поиска по сайту — тоже. Новая публичная страница — новая строка здесь.
 */
const SECTIONS = [
  '/',
  '/destinations',
  '/airlines',
  '/news',
  '/services',
  '/forum',
  '/guestbook',
  '/links',
  '/help',
];

/** sitemap.xml (L1-10): разделы, города, опубликованные новости и темы форума. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Новости и темы появляются каждый день — карта собирается при запросе, а не при сборке.
  await connection();
  const [cities, news, topics] = await Promise.all([
    listCities(),
    listNewsLinks(),
    listTopicLinks(),
  ]);
  const url = (path: string) => `${SITE_URL}${path}`;

  return [
    ...SECTIONS.map((path) => ({
      url: url(path),
      changeFrequency: 'daily' as const,
      priority: path === '/' ? 1 : 0.8,
    })),
    ...cities.map((city) => ({
      url: url(`/destinations/${city.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...news.map((item) => ({
      url: url(`/news/${item.slug}`),
      lastModified: item.updatedAt,
      priority: 0.6,
    })),
    ...topics.map((topic) => ({
      url: url(topicHref(topic.id)),
      lastModified: topic.lastPostAt,
      priority: 0.5,
    })),
  ];
}

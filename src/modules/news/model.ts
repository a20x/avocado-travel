import { z } from 'zod';
import type { SearchDocumentInput } from '@/modules/search';
import { SLUG_PATTERN } from '@/shared/lib/slug';
import type { news } from './schema';

export type News = typeof news.$inferSelect;

/** Рубрики новостей сайта: код в базе и подпись. */
export const NEWS_CATEGORIES = {
  company: 'О компании',
  routes: 'Новые направления',
  promo: 'Акции',
  service: 'Сервис',
} as const;
export type NewsCategory = keyof typeof NEWS_CATEGORIES;
const CATEGORY_KEYS = Object.keys(NEWS_CATEGORIES) as [NewsCategory, ...NewsCategory[]];

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === 'string' && value in NEWS_CATEGORIES;
}

/** Новостей на странице ленты и админки. */
export const NEWS_PAGE_SIZE = 10;

/** Строка в ленте — без полного текста. */
export type NewsListItem = Pick<
  News,
  'id' | 'slug' | 'title' | 'summary' | 'category' | 'publishedAt'
>;

/** Страница списка: записи и сколько всего страниц. */
export type NewsPage = { items: NewsListItem[]; page: number; totalPages: number };

/**
 * Новость отрасли из внешней ленты (L4-05): только заголовок, краткое описание и ссылка
 * на оригинал — полный текст остаётся на сайте источника. Готовит модуль exchange.
 */
export type ExternalNewsInput = Pick<
  News,
  'slug' | 'title' | 'summary' | 'category' | 'tags' | 'publishedAt'
> & { externalUrl: string; externalFeed: string };

export type IndustryNewsItem = Pick<
  News,
  'id' | 'title' | 'summary' | 'category' | 'tags' | 'publishedAt' | 'externalFeed'
> & { externalUrl: string };

export type IndustryNewsPage = { items: IndustryNewsItem[]; page: number; totalPages: number };

/**
 * Форма новости в админке. Дата и время публикации — по Москве, как их видит администратор.
 * Адрес необязателен: пустой соберётся из заголовка.
 */
export const newsInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Заголовок — от 5 символов')
    .max(150, 'Заголовок — до 150 символов'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, 'Адрес — до 80 символов')
    .refine((value) => value === '' || SLUG_PATTERN.test(value), 'Только латиница, цифры и дефисы'),
  summary: z
    .string()
    .trim()
    .min(10, 'Кратко — от 10 символов')
    .max(300, 'Кратко — до 300 символов'),
  body: z
    .string()
    .trim()
    .min(20, 'Текст — от 20 символов')
    .max(20_000, 'Текст — до 20 000 символов'),
  category: z.enum(CATEGORY_KEYS, 'Выберите рубрику'),
  publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
  publishedTime: z.string().regex(/^\d{2}:\d{2}$/, 'Укажите время'),
});
export type NewsInput = z.infer<typeof newsInputSchema>;

export type NewsError = 'NOT_FOUND' | 'SLUG_TAKEN';

/** Абзацы текста: разделитель — пустая строка; переносы внутри абзаца сохраняются как пробел. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Документ поискового индекса для новости: краткое описание и текст. До даты публикации
 * новость не ищется — как и не видна в ленте.
 */
export function newsSearchDocument(
  item: Pick<News, 'id' | 'slug' | 'title' | 'summary' | 'body' | 'publishedAt'>,
): SearchDocumentInput {
  return {
    kind: 'news',
    refId: item.id,
    url: `/news/${item.slug}`,
    title: item.title,
    body: `${item.summary}\n\n${item.body}`,
    visibleFrom: item.publishedAt,
  };
}

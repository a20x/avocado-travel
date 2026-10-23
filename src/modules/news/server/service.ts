import 'server-only';
import { z } from 'zod';
import { indexDocument, removeDocument } from '@/modules/search/server';
import { fail, ok, type Result } from '@/shared/lib/result';
import { slugify } from '@/shared/lib/slug';
import { dateInZone, timeInZone, zonedTimeToUtc } from '@/shared/lib/time';
import {
  NEWS_PAGE_SIZE,
  isNewsCategory,
  newsSearchDocument,
  type News,
  type NewsError,
  type NewsInput,
  type NewsPage,
} from '../model';
import * as repository from './repository';

/** Время публикации администратор задаёт по Москве — так его и показываем. */
const ADMIN_TIMEZONE = 'Europe/Moscow';

/** Номер страницы из адреса: всё непонятное — первая страница. */
function pageNumber(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

async function listPage(
  page: number,
  filter: { publishedBefore?: Date; category?: string },
): Promise<NewsPage> {
  const { items, total } = await repository.findSiteNews({
    ...filter,
    limit: NEWS_PAGE_SIZE,
    offset: (page - 1) * NEWS_PAGE_SIZE,
  });
  return { items, page, totalPages: Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE)) };
}

/** Лента новостей сайта для посетителей: только опубликованные, свежие сверху. */
export function listNews(
  params: { page?: unknown; category?: unknown },
  now: Date = new Date(),
): Promise<NewsPage> {
  return listPage(pageNumber(params.page), {
    publishedBefore: now,
    category: isNewsCategory(params.category) ? params.category : undefined,
  });
}

/** Страница опубликованных новостей для публичного API: источник, рубрика, размер страницы. */
export function listPublishedNews(
  params: { source?: 'site' | 'external'; category?: string; page: number; pageSize: number },
  now: Date = new Date(),
) {
  return repository.findPublishedNews({
    now,
    source: params.source,
    category: params.category,
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
  });
}

/** Последние опубликованные новости с текстом — для ленты `/feed.json` и выгрузки. */
export function listLatestNews(
  params: { source?: 'site' | 'external'; limit: number },
  now: Date = new Date(),
): Promise<News[]> {
  return repository.findLatestPublished({ now, ...params });
}

/** Новость по адресу или null — несуществующая и ещё не опубликованная одинаково не видны. */
export async function getNews(slug: string, now: Date = new Date()): Promise<News | null> {
  return (await repository.findPublishedBySlug(slug, now)) ?? null;
}

/** Все опубликованные новости сайта — адрес и время правки, для sitemap.xml. */
export function listNewsLinks(
  now: Date = new Date(),
): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return repository.findPublishedLinks(now);
}

/* Админка. Права проверяет action, который вызывает эти функции. */

/** Все новости сайта, включая запланированные. */
export function listNewsForAdmin(params: { page?: unknown }): Promise<NewsPage> {
  return listPage(pageNumber(params.page), {});
}

/** Новость для формы редактирования: дата и время — по Москве. */
export async function getNewsForEdit(id: unknown): Promise<(NewsInput & { id: string }) | null> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return null;
  const item = await repository.findById(parsed.data);
  if (!item || item.source !== 'site' || !isNewsCategory(item.category)) return null;
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    body: item.body,
    category: item.category,
    publishedDate: dateInZone(item.publishedAt, ADMIN_TIMEZONE),
    publishedTime: timeInZone(item.publishedAt, ADMIN_TIMEZONE),
  };
}

/** Значения для базы: адрес по умолчанию — из заголовка, время — в UTC. */
function toValues(input: NewsInput) {
  return {
    slug: input.slug || slugify(input.title) || 'news',
    title: input.title,
    summary: input.summary,
    body: input.body,
    category: input.category,
    publishedAt: zonedTimeToUtc(input.publishedDate, input.publishedTime, ADMIN_TIMEZONE),
  };
}

export async function createNews(
  input: NewsInput,
): Promise<Result<{ id: string; slug: string }, NewsError>> {
  const values = toValues(input);
  if (await repository.isSlugTaken(values.slug)) return fail('SLUG_TAKEN');
  const id = await repository.insertNews(values);
  await indexDocument(newsSearchDocument({ id, ...values }));
  return ok({ id, slug: values.slug });
}

export async function updateNews(
  id: string,
  input: NewsInput,
  now: Date = new Date(),
): Promise<Result<{ slug: string }, NewsError>> {
  const values = toValues(input);
  if (await repository.isSlugTaken(values.slug, id)) return fail('SLUG_TAKEN');
  if (!(await repository.updateNews(id, values, now))) return fail('NOT_FOUND');
  await indexDocument(newsSearchDocument({ id, ...values }));
  return ok({ slug: values.slug });
}

export async function deleteNews(id: unknown): Promise<Result<null, NewsError>> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail('NOT_FOUND');
  if (!(await repository.deleteNews(parsed.data))) return fail('NOT_FOUND');
  await removeDocument('news', parsed.data);
  return ok(null);
}

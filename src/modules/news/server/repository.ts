import 'server-only';
import { and, count, desc, eq, lte, ne, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import type { News, NewsListItem } from '../model';
import { news } from '../schema';

const listColumns = {
  id: news.id,
  slug: news.slug,
  title: news.title,
  summary: news.summary,
  category: news.category,
  publishedAt: news.publishedAt,
};

type ListFilter = {
  /** Только опубликованные к этому моменту; без него — все (для админки). */
  publishedBefore?: Date;
  category?: string;
  limit: number;
  offset: number;
};

/** Новости сайта, свежие сверху, и сколько их всего под фильтр. */
export async function findSiteNews(
  filter: ListFilter,
): Promise<{ items: NewsListItem[]; total: number }> {
  const conditions: Array<SQL | undefined> = [
    eq(news.source, 'site'),
    filter.publishedBefore ? lte(news.publishedAt, filter.publishedBefore) : undefined,
    filter.category ? eq(news.category, filter.category) : undefined,
  ];
  const where = and(...conditions);
  const [items, [totals]] = await Promise.all([
    db
      .select(listColumns)
      .from(news)
      .where(where)
      .orderBy(desc(news.publishedAt))
      .limit(filter.limit)
      .offset(filter.offset),
    db.select({ total: count() }).from(news).where(where),
  ]);
  return { items, total: totals?.total ?? 0 };
}

/** Новость по адресу — только опубликованная к моменту `now`. */
export async function findPublishedBySlug(slug: string, now: Date): Promise<News | undefined> {
  const [item] = await db
    .select()
    .from(news)
    .where(and(eq(news.slug, slug), lte(news.publishedAt, now)));
  return item;
}

export async function findById(id: string): Promise<News | undefined> {
  const [item] = await db.select().from(news).where(eq(news.id, id));
  return item;
}

/** Занят ли адрес другой новостью. */
export async function isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [item] = await db
    .select({ id: news.id })
    .from(news)
    .where(and(eq(news.slug, slug), exceptId ? ne(news.id, exceptId) : undefined));
  return Boolean(item);
}

type NewsValues = Pick<News, 'slug' | 'title' | 'summary' | 'body' | 'category' | 'publishedAt'>;

export async function insertNews(values: NewsValues): Promise<string> {
  const [created] = await db
    .insert(news)
    .values({ ...values, source: 'site' })
    .returning({ id: news.id });
  if (!created) throw new Error('Новость не создана');
  return created.id;
}

export async function updateNews(id: string, values: NewsValues, now: Date): Promise<boolean> {
  const updated = await db
    .update(news)
    .set({ ...values, updatedAt: now })
    .where(and(eq(news.id, id), eq(news.source, 'site')))
    .returning({ id: news.id });
  return updated.length > 0;
}

export async function deleteNews(id: string): Promise<boolean> {
  const deleted = await db.delete(news).where(eq(news.id, id)).returning({ id: news.id });
  return deleted.length > 0;
}

/** Адреса опубликованных новостей сайта и время их правки — для sitemap.xml. */
export function findPublishedLinks(now: Date): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return db
    .select({ slug: news.slug, updatedAt: news.updatedAt })
    .from(news)
    .where(and(eq(news.source, 'site'), lte(news.publishedAt, now)))
    .orderBy(desc(news.publishedAt));
}

/** Опубликованные новости любого источника для публичного API, свежие сверху, и их число. */
export async function findPublishedNews(filter: {
  now: Date;
  source?: 'site' | 'external';
  category?: string;
  limit: number;
  offset: number;
}): Promise<{ items: Array<NewsListItem & { source: 'site' | 'external' }>; total: number }> {
  const where = and(
    lte(news.publishedAt, filter.now),
    filter.source ? eq(news.source, filter.source) : undefined,
    filter.category ? eq(news.category, filter.category) : undefined,
  );
  const [items, [totals]] = await Promise.all([
    db
      .select({ ...listColumns, source: news.source })
      .from(news)
      .where(where)
      .orderBy(desc(news.publishedAt), desc(news.id))
      .limit(filter.limit)
      .offset(filter.offset),
    db.select({ total: count() }).from(news).where(where),
  ]);
  return { items, total: totals?.total ?? 0 };
}

/** Последние опубликованные новости целиком, свежие сверху — для ленты и выгрузки. */
export function findLatestPublished(filter: {
  now: Date;
  source?: 'site' | 'external';
  limit: number;
}): Promise<News[]> {
  return db
    .select()
    .from(news)
    .where(
      and(
        lte(news.publishedAt, filter.now),
        filter.source ? eq(news.source, filter.source) : undefined,
      ),
    )
    .orderBy(desc(news.publishedAt), desc(news.id))
    .limit(filter.limit);
}

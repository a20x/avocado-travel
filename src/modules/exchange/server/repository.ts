import 'server-only';
import { and, asc, count, desc, eq, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { news } from '@/modules/news';
import { db } from '@/server/db';
import type { CombinedQuery } from '../combined';
import type { ExternalFeed, ExternalFeedStatus, IndustryCategory } from '../feeds';
import { externalFeeds } from '../schema';

/**
 * Внешние ленты (своя таблица) и общая лента вкладки «RSS». Новости — таблица модуля news:
 * здесь их только читаем (ADR-0007), удаляет их сервис news.
 */

const asFeed = (row: typeof externalFeeds.$inferSelect): ExternalFeed => ({
  id: row.id,
  name: row.name,
  url: row.url,
  category: row.category as IndustryCategory,
});

export async function findFeeds(): Promise<ExternalFeed[]> {
  const rows = await db.select().from(externalFeeds).orderBy(asc(externalFeeds.createdAt));
  return rows.map(asFeed);
}

/** Ленты со сведениями о последнем импорте и числом новостей на сайте. */
export async function findFeedStatuses(): Promise<ExternalFeedStatus[]> {
  const counts = db
    .select({ feed: news.externalFeed, total: count().as('total') })
    .from(news)
    .where(eq(news.source, 'external'))
    .groupBy(news.externalFeed)
    .as('feed_news');
  const rows = await db
    .select({
      feed: externalFeeds,
      newsCount: sql<number>`coalesce(${counts.total}, 0)`.mapWith(Number),
    })
    .from(externalFeeds)
    .leftJoin(counts, eq(counts.feed, externalFeeds.id))
    .orderBy(asc(externalFeeds.createdAt));
  return rows.map(({ feed, newsCount }) => ({
    ...asFeed(feed),
    checkedAt: feed.checkedAt,
    lastError: feed.lastError,
    lastAdded: feed.lastAdded,
    newsCount,
  }));
}

export async function findFeedById(id: string): Promise<ExternalFeed | undefined> {
  const [row] = await db.select().from(externalFeeds).where(eq(externalFeeds.id, id));
  return row ? asFeed(row) : undefined;
}

/** Новая лента; false — такой адрес уже подключён. */
export async function insertFeed(feed: ExternalFeed): Promise<boolean> {
  const inserted = await db
    .insert(externalFeeds)
    .values(feed)
    .onConflictDoNothing()
    .returning({ id: externalFeeds.id });
  return inserted.length > 0;
}

export async function deleteFeed(id: string): Promise<boolean> {
  const deleted = await db
    .delete(externalFeeds)
    .where(eq(externalFeeds.id, id))
    .returning({ id: externalFeeds.id });
  return deleted.length > 0;
}

export async function updateFeedStatus(
  id: string,
  status: { checkedAt: Date; lastError: string | null; lastAdded: number },
): Promise<void> {
  await db.update(externalFeeds).set(status).where(eq(externalFeeds.id, id));
}

export type CombinedRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  isExternal: boolean;
  externalUrl: string | null;
  feedName: string | null;
  publishedAt: Date;
};

const ORDER: Record<CombinedQuery['sort'], SQL[]> = {
  new: [desc(news.publishedAt), desc(news.id)],
  old: [asc(news.publishedAt), asc(news.id)],
  title: [asc(news.title), desc(news.publishedAt)],
};

/**
 * Общая лента: опубликованные новости сайта и новости внешних лент. Источник — `site`,
 * `external` или код ленты; поиск — по заголовку и краткому описанию без учёта регистра.
 */
export async function findCombinedNews(
  filter: Pick<CombinedQuery, 'q' | 'source' | 'sort'>,
  paging: { limit: number; offset: number },
  now: Date,
): Promise<{ rows: CombinedRow[]; total: number }> {
  const published = or(
    and(eq(news.source, 'site'), lte(news.publishedAt, now)),
    eq(news.source, 'external'),
  );
  const source =
    filter.source === 'all'
      ? undefined
      : filter.source === 'site'
        ? eq(news.source, 'site')
        : filter.source === 'external'
          ? eq(news.source, 'external')
          : eq(news.externalFeed, filter.source);
  // Знаки % и _ в запросе — обычные символы, а не шаблон LIKE.
  const pattern = `%${filter.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  const search = filter.q
    ? or(ilike(news.title, pattern), ilike(news.summary, pattern))
    : undefined;
  const where = and(published, source, search);

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: news.id,
        slug: news.slug,
        title: news.title,
        summary: news.summary,
        category: news.category,
        isExternal: sql<boolean>`${news.source} = 'external'`,
        externalUrl: news.externalUrl,
        feedName: externalFeeds.name,
        publishedAt: news.publishedAt,
      })
      .from(news)
      .leftJoin(externalFeeds, eq(externalFeeds.id, news.externalFeed))
      .where(where)
      .orderBy(...ORDER[filter.sort])
      .limit(paging.limit)
      .offset(paging.offset),
    db.select({ total: count() }).from(news).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

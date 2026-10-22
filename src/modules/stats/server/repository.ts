import 'server-only';
import { and, count, countDistinct, desc, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import type { Counters, StatsReport, Totals } from '../model';
import { pageViews } from '../schema';

type Range = { start: Date; end: Date };

const inRange = (range: Range) =>
  and(gte(pageViews.createdAt, range.start), lt(pageViews.createdAt, range.end));

const totals = { views: count(), visitors: countDistinct(pageViews.visitorHash) };

export async function insertView(values: {
  path: string;
  section: string;
  visitorHash: string;
  referrerHost: string | null;
}): Promise<void> {
  await db.insert(pageViews).values(values);
}

/** Цифры счётчика одним запросом. */
export async function findCounters(todayStart: Date): Promise<Counters> {
  const today = sql`${pageViews.createdAt} >= ${todayStart}`;
  const [row] = await db
    .select({
      viewsTotal: count(),
      viewsToday: sql`count(*) filter (where ${today})`.mapWith(Number),
      visitorsToday: sql`count(distinct ${pageViews.visitorHash}) filter (where ${today})`.mapWith(
        Number,
      ),
    })
    .from(pageViews);
  return row ?? { viewsTotal: 0, viewsToday: 0, visitorsToday: 0 };
}

export async function findTotals(range?: Range): Promise<Totals> {
  const [row] = await db
    .select(totals)
    .from(pageViews)
    .where(range ? inRange(range) : undefined);
  return row ?? { views: 0, visitors: 0 };
}

/** Просмотры и посетители по дням (по Москве). */
export function findByDay(range: Range): Promise<Array<{ date: string } & Totals>> {
  const day = sql<string>`to_char(${pageViews.createdAt} at time zone 'Europe/Moscow', 'YYYY-MM-DD')`;
  return db
    .select({ date: day, ...totals })
    .from(pageViews)
    .where(inRange(range))
    .groupBy(day);
}

export function findBySection(range: Range): Promise<StatsReport['bySection']> {
  return db
    .select({ section: pageViews.section, ...totals })
    .from(pageViews)
    .where(inRange(range))
    .groupBy(pageViews.section)
    .orderBy(desc(count()));
}

export function findReferrers(range: Range, limit: number): Promise<StatsReport['referrers']> {
  return db
    .select({ host: sql<string>`${pageViews.referrerHost}`, views: count() })
    .from(pageViews)
    .where(and(inRange(range), isNotNull(pageViews.referrerHost)))
    .groupBy(pageViews.referrerHost)
    .orderBy(desc(count()))
    .limit(limit);
}

/** Журнал: последние просмотры периода. */
export function findRecent(range: Range, limit: number): Promise<StatsReport['recent']> {
  return db
    .select({
      createdAt: pageViews.createdAt,
      path: pageViews.path,
      referrerHost: pageViews.referrerHost,
    })
    .from(pageViews)
    .where(inRange(range))
    .orderBy(desc(pageViews.createdAt), desc(pageViews.id))
    .limit(limit);
}

import 'server-only';
import { and, avg, count, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { siteRatings } from '../schema';

export async function findSummary(): Promise<{ average: number | null; count: number }> {
  const [row] = await db
    .select({ average: avg(siteRatings.score).mapWith(Number), count: count() })
    .from(siteRatings);
  return { average: row?.count ? row.average : null, count: row?.count ?? 0 };
}

export async function findScore(visitorHash: string, day: string): Promise<number | null> {
  const [row] = await db
    .select({ score: siteRatings.score })
    .from(siteRatings)
    .where(and(eq(siteRatings.visitorHash, visitorHash), eq(siteRatings.day, day)));
  return row?.score ?? null;
}

/** false — этот посетитель сегодня уже оценивал. */
export async function insertRating(values: {
  score: number;
  visitorHash: string;
  day: string;
}): Promise<boolean> {
  const inserted = await db
    .insert(siteRatings)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: siteRatings.id });
  return inserted.length > 0;
}

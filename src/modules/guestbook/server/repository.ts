import 'server-only';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import type { BannedHost, GuestbookEntry, PublicEntry, StopWord } from '../model';
import { guestbookBannedHosts, guestbookEntries, guestbookStopWords } from '../schema';

type Paging = { limit: number; offset: number };

/** Видимые записи для посетителей, новые сверху. */
export async function findVisibleEntries(
  paging: Paging,
): Promise<{ items: PublicEntry[]; total: number }> {
  const where = eq(guestbookEntries.isVisible, true);
  const [items, [totals]] = await Promise.all([
    db
      .select({
        id: guestbookEntries.id,
        authorName: guestbookEntries.authorName,
        message: guestbookEntries.message,
        createdAt: guestbookEntries.createdAt,
      })
      .from(guestbookEntries)
      .where(where)
      .orderBy(desc(guestbookEntries.createdAt))
      .limit(paging.limit)
      .offset(paging.offset),
    db.select({ total: count() }).from(guestbookEntries).where(where),
  ]);
  return { items, total: totals?.total ?? 0 };
}

/** Все записи для администратора, включая скрытые. */
export async function findAllEntries(
  paging: Paging,
): Promise<{ items: GuestbookEntry[]; total: number }> {
  const [items, [totals]] = await Promise.all([
    db
      .select()
      .from(guestbookEntries)
      .orderBy(desc(guestbookEntries.createdAt))
      .limit(paging.limit)
      .offset(paging.offset),
    db.select({ total: count() }).from(guestbookEntries),
  ]);
  return { items, total: totals?.total ?? 0 };
}

export async function insertEntry(
  values: Pick<
    GuestbookEntry,
    'authorName' | 'message' | 'ip' | 'userAgent' | 'isVisible' | 'hiddenReason'
  >,
): Promise<void> {
  await db.insert(guestbookEntries).values(values);
}

export async function setEntryVisibility(
  id: string,
  isVisible: boolean,
  hiddenReason: GuestbookEntry['hiddenReason'],
): Promise<boolean> {
  const updated = await db
    .update(guestbookEntries)
    .set({ isVisible, hiddenReason })
    .where(eq(guestbookEntries.id, id))
    .returning({ id: guestbookEntries.id });
  return updated.length > 0;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const deleted = await db
    .delete(guestbookEntries)
    .where(eq(guestbookEntries.id, id))
    .returning({ id: guestbookEntries.id });
  return deleted.length > 0;
}

/** Записи, видимость которых зависит от списка слов: видимые и скрытые из-за слова. */
export function findEntriesForWordCheck() {
  return db
    .select({
      id: guestbookEntries.id,
      authorName: guestbookEntries.authorName,
      message: guestbookEntries.message,
      isVisible: guestbookEntries.isVisible,
    })
    .from(guestbookEntries)
    .where(
      or(eq(guestbookEntries.isVisible, true), eq(guestbookEntries.hiddenReason, 'stop_word')),
    );
}

/** Скрывает и показывает записи по результатам проверки слов — одной транзакцией. */
export async function applyWordCheck(hide: string[], show: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    if (hide.length > 0) {
      await tx
        .update(guestbookEntries)
        .set({ isVisible: false, hiddenReason: 'stop_word' })
        .where(inArray(guestbookEntries.id, hide));
    }
    if (show.length > 0) {
      await tx
        .update(guestbookEntries)
        .set({ isVisible: true, hiddenReason: null })
        .where(
          and(inArray(guestbookEntries.id, show), eq(guestbookEntries.hiddenReason, 'stop_word')),
        );
    }
  });
}

export function findStopWords(): Promise<StopWord[]> {
  return db.select().from(guestbookStopWords).orderBy(asc(guestbookStopWords.word));
}

/** false — такое слово уже есть. */
export async function insertStopWord(word: string): Promise<boolean> {
  const inserted = await db
    .insert(guestbookStopWords)
    .values({ word })
    .onConflictDoNothing()
    .returning({ id: guestbookStopWords.id });
  return inserted.length > 0;
}

export async function deleteStopWord(id: number): Promise<boolean> {
  const deleted = await db
    .delete(guestbookStopWords)
    .where(eq(guestbookStopWords.id, id))
    .returning({ id: guestbookStopWords.id });
  return deleted.length > 0;
}

export function findBannedHosts(): Promise<BannedHost[]> {
  return db.select().from(guestbookBannedHosts).orderBy(desc(guestbookBannedHosts.createdAt));
}

/** Попадает ли IP в один из запрещённых адресов или подсетей. Проверку делает PostgreSQL (`<<=`). */
export async function isHostBanned(ip: string): Promise<boolean> {
  const [row] = await db
    .select({ id: guestbookBannedHosts.id })
    .from(guestbookBannedHosts)
    .where(sql`${ip}::inet <<= ${guestbookBannedHosts.pattern}`)
    .limit(1);
  return Boolean(row);
}

/** false — такой адрес уже в списке. */
export async function insertBannedHost(pattern: string, comment: string): Promise<boolean> {
  const inserted = await db
    .insert(guestbookBannedHosts)
    .values({ pattern, comment })
    .onConflictDoNothing()
    .returning({ id: guestbookBannedHosts.id });
  return inserted.length > 0;
}

export async function deleteBannedHost(id: number): Promise<boolean> {
  const deleted = await db
    .delete(guestbookBannedHosts)
    .where(eq(guestbookBannedHosts.id, id))
    .returning({ id: guestbookBannedHosts.id });
  return deleted.length > 0;
}

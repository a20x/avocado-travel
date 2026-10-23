import 'server-only';
import { and, count, desc, eq, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import { HIGHLIGHT, type SearchDocumentInput, type SearchHit, type SearchKind } from '../model';
import { searchDocuments } from '../schema';

type Paging = { limit: number; offset: number };

/** Документ по паре «вид + id в своём модуле»: новый добавляется, существующий заменяется. */
export async function upsertDocument(doc: SearchDocumentInput): Promise<void> {
  await db
    .insert(searchDocuments)
    .values(doc)
    .onConflictDoUpdate({
      target: [searchDocuments.kind, searchDocuments.refId],
      set: {
        url: doc.url,
        title: doc.title,
        body: doc.body,
        visibleFrom: doc.visibleFrom,
        updatedAt: new Date(),
      },
    });
}

export async function deleteDocument(kind: SearchKind, refId: string): Promise<void> {
  await db
    .delete(searchDocuments)
    .where(and(eq(searchDocuments.kind, kind), eq(searchDocuments.refId, refId)));
}

/** Отрывок: до двух фрагментов по 15–35 слов с найденными словами в метках HIGHLIGHT. */
const SNIPPET_OPTIONS = `StartSel=${HIGHLIGHT.start}, StopSel=${HIGHLIGHT.stop}, MinWords=15, MaxWords=35, MaxFragments=2, FragmentDelimiter=" … "`;
const TITLE_OPTIONS = `StartSel=${HIGHLIGHT.start}, StopSel=${HIGHLIGHT.stop}, HighlightAll=true`;

/**
 * Полнотекстовый поиск. `webQuery` — строка для websearch_to_tsquery (см. toWebSearch):
 * PostgreSQL сам разбирает её безопасно, склейки SQL нет. Сначала самые подходящие
 * (ts_rank_cd учитывает, что слова в заголовке важнее), затем свежие.
 */
export async function search(
  webQuery: string,
  kind: SearchKind | undefined,
  paging: Paging,
  now: Date,
): Promise<{ hits: SearchHit[]; counts: Array<{ kind: SearchKind; total: number }> }> {
  const query = sql`websearch_to_tsquery('russian', ${webQuery})`;
  const matches: SQL[] = [
    sql`${searchDocuments.tsv} @@ ${query}`,
    or(isNull(searchDocuments.visibleFrom), lte(searchDocuments.visibleFrom, now)) as SQL,
  ];
  const rank = sql`ts_rank_cd(${searchDocuments.tsv}, ${query})`;

  const [hits, counts] = await Promise.all([
    db
      .select({
        id: searchDocuments.id,
        kind: searchDocuments.kind,
        url: searchDocuments.url,
        title: sql<string>`ts_headline('russian', ${searchDocuments.title}, ${query}, ${TITLE_OPTIONS})`,
        snippet: sql<string>`ts_headline('russian', ${searchDocuments.body}, ${query}, ${SNIPPET_OPTIONS})`,
      })
      .from(searchDocuments)
      .where(and(...matches, kind ? eq(searchDocuments.kind, kind) : undefined))
      .orderBy(desc(rank), desc(searchDocuments.updatedAt))
      .limit(paging.limit)
      .offset(paging.offset),
    db
      .select({ kind: searchDocuments.kind, total: count() })
      .from(searchDocuments)
      .where(and(...matches))
      .groupBy(searchDocuments.kind),
  ]);
  return { hits, counts };
}

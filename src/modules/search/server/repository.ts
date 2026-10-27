import 'server-only';
import { and, asc, count, desc, eq, gte, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { pageViews } from '@/modules/stats';
import { db } from '@/server/db';
import {
  HIGHLIGHT,
  type SearchDocumentInput,
  type SearchHit,
  type SearchKind,
  type SearchSuggestion,
} from '../model';
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

/** Заголовок с «ё» как «е» — так же, как его разбирает индекс (schema.ts). */
const title = sql`translate(${searchDocuments.title}, 'Ёё', 'Ее')`;

const isVisible = (now: Date) =>
  or(isNull(searchDocuments.visibleFrom), lte(searchDocuments.visibleFrom, now)) as SQL;

/**
 * Полнотекстовый поиск. `webQuery` — строка для websearch_to_tsquery (см. toWebSearch):
 * PostgreSQL сам разбирает её безопасно, склейки SQL нет. Порядок: сначала страница, чей
 * заголовок и есть запрос (`titleText`, «направление» → «Направления»), затем страницы
 * с запросом в заголовке, затем остальные по релевантности (ts_rank_cd учитывает, что слова
 * в заголовке важнее) и свежести.
 */
export async function search(
  webQuery: string,
  titleText: string | null,
  kind: SearchKind | undefined,
  paging: Paging,
  now: Date,
): Promise<{ hits: SearchHit[]; counts: Array<{ kind: SearchKind; total: number }> }> {
  const query = sql`websearch_to_tsquery('russian', ${webQuery})`;
  const matches: SQL[] = [sql`${searchDocuments.tsv} @@ ${query}`, isVisible(now)];
  const rank = sql`ts_rank_cd(${searchDocuments.tsv}, ${query})`;
  // Константу (false) PostgreSQL в ORDER BY не принимает — без titleText условия просто нет.
  const titleIsQuery = titleText
    ? [
        desc(
          sql`strip(to_tsvector('russian', ${title})) = strip(to_tsvector('russian', ${titleText}))`,
        ),
      ]
    : [];
  const pageTitleMatches = sql`${searchDocuments.kind} = 'page' and to_tsvector('russian', ${title}) @@ ${query}`;

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
      .orderBy(...titleIsQuery, desc(pageTitleMatches), desc(rank), desc(searchDocuments.updatedAt))
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

/**
 * Подсказки: документы, в заголовке которых есть начала набранных слов (словарь simple)
 * или сами слова в любой форме (русский словарь: «авиакомпания» → «Авиакомпании»).
 * Порядок: сначала страницы сайта, затем новости, затем форум (так объявлен enum search_kind);
 * внутри — заголовки, которые начинаются с набранного, затем самые посещаемые с `since`
 * (счётчик посещений, таблица page_views модуля stats), затем короткие.
 */
export async function suggest(
  prefixQuery: string,
  text: string,
  limit: number,
  now: Date,
  since: Date,
): Promise<SearchSuggestion[]> {
  const views = db.$with('views').as(
    db
      .select({ path: pageViews.path, total: count().as('total') })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(pageViews.path),
  );
  return db
    .with(views)
    .select({ kind: searchDocuments.kind, url: searchDocuments.url, title: searchDocuments.title })
    .from(searchDocuments)
    .leftJoin(views, eq(views.path, searchDocuments.url))
    .where(
      and(
        or(
          sql`to_tsvector('simple', ${title}) @@ to_tsquery('simple', ${prefixQuery})`,
          sql`to_tsvector('russian', ${title}) @@ plainto_tsquery('russian', ${text})`,
        ),
        isVisible(now),
      ),
    )
    .orderBy(
      asc(searchDocuments.kind),
      desc(sql`starts_with(lower(${title}), ${text})`),
      desc(sql`coalesce(${views.total}, 0)`),
      asc(sql`length(${searchDocuments.title})`),
    )
    .limit(limit);
}

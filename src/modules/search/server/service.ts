import 'server-only';
import {
  SEARCH_PAGE_SIZE,
  SUGGEST_LIMIT,
  exactTitleText,
  parseQuery,
  searchKindSchema,
  suggestTerms,
  toPrefixQuery,
  toWebSearch,
  type ParsedQuery,
  type SearchDocumentInput,
  type SearchKind,
  type SearchResults,
  type SearchSuggestion,
} from '../model';
import * as repository from './repository';

function pageNumber(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * Поиск по сайту (L1-S05). Пустой запрос или запрос без искомых слов — `results: null`:
 * страница покажет подсказку, а не все документы подряд.
 */
export async function searchSite(
  params: { q?: unknown; kind?: unknown; page?: unknown },
  now = new Date(),
): Promise<{ parsed: ParsedQuery; kind: SearchKind | undefined; results: SearchResults | null }> {
  const parsed = parseQuery(typeof params.q === 'string' ? params.q.slice(0, 300) : '');
  const kind = searchKindSchema.parse(params.kind);
  if (parsed.length === 0) return { parsed, kind, results: null };

  const page = pageNumber(params.page);
  const { hits, counts } = await repository.search(
    toWebSearch(parsed),
    exactTitleText(parsed),
    kind,
    { limit: SEARCH_PAGE_SIZE, offset: (page - 1) * SEARCH_PAGE_SIZE },
    now,
  );
  const byKind = { page: 0, news: 0, forum: 0 };
  for (const row of counts) byKind[row.kind] = row.total;
  const all = byKind.page + byKind.news + byKind.forum;
  const shown = kind ? byKind[kind] : all;
  return {
    parsed,
    kind,
    results: {
      hits,
      counts: { all, ...byKind },
      page,
      totalPages: Math.max(1, Math.ceil(shown / SEARCH_PAGE_SIZE)),
    },
  };
}

/** Подсказки под строкой поиска, пока посетитель печатает. Меньше двух букв — пусто. */
export async function suggestSite(q: unknown, now = new Date()): Promise<SearchSuggestion[]> {
  const words = suggestTerms(typeof q === 'string' ? q.slice(0, 100) : '');
  if (!words) return [];
  return repository.suggest(toPrefixQuery(words), words.join(' '), SUGGEST_LIMIT, now);
}

/**
 * Добавить или обновить документ индекса. Вызывают сервисы модулей-владельцев при сохранении
 * новостей и сообщений форума (docs/04-data-model.md, «Поиск по сайту»).
 */
export function indexDocument(doc: SearchDocumentInput): Promise<void> {
  return repository.upsertDocument(doc);
}

export function removeDocument(kind: SearchKind, refId: string): Promise<void> {
  return repository.deleteDocument(kind, refId);
}

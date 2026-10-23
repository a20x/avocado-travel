/**
 * Модуль search: полнотекстовый поиск по страницам, новостям и форуму с операторами
 * И, ИЛИ, НЕ (L1-S05). Общий вход: можно импортировать откуда угодно. Сервисы —
 * в `@/modules/search/server`, компоненты — в `@/modules/search/ui` (ADR-0008).
 */
export { searchDocuments, searchKind } from './schema';
export {
  HIGHLIGHT,
  SEARCH_KINDS,
  SEARCH_PAGE_SIZE,
  describeQuery,
  normalizeText,
  parseQuery,
  splitHighlights,
  toWebSearch,
} from './model';
export type {
  ParsedQuery,
  SearchDocumentInput,
  SearchHit,
  SearchKind,
  SearchResults,
} from './model';

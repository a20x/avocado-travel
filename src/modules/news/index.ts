/**
 * Модуль news: новости сайта и (в T-32) импортированные новости отрасли.
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/news/server`,
 * компоненты — в `@/modules/news/ui` (ADR-0008).
 */

/** Таблица публикуется для чтения в чужих репозиториях: поиск по сайту, API (ADR-0007). */
export { news, newsSource } from './schema';

export {
  NEWS_CATEGORIES,
  NEWS_PAGE_SIZE,
  isNewsCategory,
  newsInputSchema,
  newsSearchDocument,
  splitParagraphs,
} from './model';
export type {
  ExternalNewsInput,
  IndustryNewsItem,
  IndustryNewsPage,
  News,
  NewsCategory,
  NewsError,
  NewsInput,
  NewsListItem,
  NewsPage,
} from './model';

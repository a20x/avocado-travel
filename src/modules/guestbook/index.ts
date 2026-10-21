/**
 * Модуль guestbook: гостевая книга с модерацией, запрещёнными словами и хостами (L1-S04).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/guestbook/server`,
 * компоненты — в `@/modules/guestbook/ui` (ADR-0008).
 */
export { guestbookBannedHosts, guestbookEntries, guestbookStopWords, hiddenReason } from './schema';
export {
  ENTRIES_PAGE_SIZE,
  bannedHostSchema,
  entryInputSchema,
  findStopWord,
  normalizeText,
  stopWordSchema,
} from './model';
export type { BannedHost, GuestbookEntry, GuestbookError, PublicEntry, StopWord } from './model';

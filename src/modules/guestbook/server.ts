/**
 * Серверный вход модуля guestbook (ADR-0008).
 */
import 'server-only';

export { listBannedHosts, listEntries, listEntriesForAdmin, listStopWords } from './server/service';

/**
 * Серверный вход модуля search (ADR-0008).
 */
import 'server-only';

export { indexDocument, removeDocument, searchSite, suggestSite } from './server/service';
export { handleSuggestRequest } from './server/suggest';

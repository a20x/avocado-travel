/**
 * Серверный вход модуля search (ADR-0008).
 */
import 'server-only';

export { indexDocument, removeDocument, searchSite } from './server/service';

/**
 * Серверный вход модуля news (ADR-0008).
 */
import 'server-only';

export { getNews, getNewsForEdit, listNews, listNewsForAdmin } from './server/service';

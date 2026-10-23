/**
 * Серверный вход модуля news (ADR-0008).
 */
import 'server-only';

export {
  getNews,
  getNewsForEdit,
  listNews,
  listNewsForAdmin,
  listNewsLinks,
} from './server/service';

/**
 * Серверный вход модуля news (ADR-0008).
 */
import 'server-only';

export {
  getNews,
  getNewsForEdit,
  listNews,
  listNewsForAdmin,
  listLatestNews,
  listNewsLinks,
  listPublishedNews,
  pruneIndustryNews,
  removeIndustryNewsOfFeed,
  trimIndustryNews,
  saveIndustryNews,
} from './server/service';

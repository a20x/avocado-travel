/**
 * Серверный вход модуля exchange (ADR-0008).
 */
import 'server-only';

export { apiRoute, handleFeed, handleOpenApi, handleUnknownEndpoint } from './server/route';
export { handleImportFeedsCron, importIndustryNews } from './server/import';
export {
  MAX_UPLOAD_BYTES,
  PREVIEW_ITEMS,
  getFeedNames,
  getRssPage,
  handleCombinedExport,
  handleRssFeed,
} from './server/feeds';
export type { RssPage, RssPreview } from './server/feeds';

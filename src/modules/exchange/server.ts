/**
 * Серверный вход модуля exchange (ADR-0008).
 */
import 'server-only';

export { apiRoute, handleFeed, handleOpenApi, handleUnknownEndpoint } from './server/route';
export { handleImportFeedsCron, importIndustryNews } from './server/import';

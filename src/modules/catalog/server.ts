/**
 * Серверный вход модуля catalog (ADR-0008).
 */
import 'server-only';

export { getCatalogForAdmin, getPublicCatalog } from './server/service';

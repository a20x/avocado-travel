/**
 * Серверный вход модуля stats (ADR-0008).
 */
import 'server-only';

export { handleHitRequest } from './server/hit';
export { getMetrikaId, getReport } from './server/service';

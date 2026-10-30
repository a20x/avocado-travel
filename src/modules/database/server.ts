/**
 * Серверный вход модуля database (ADR-0008).
 */
import 'server-only';

export { getFlightCombos, getPassport, runDatabaseQuery } from './server/service';
export type { DatabasePage } from './server/service';

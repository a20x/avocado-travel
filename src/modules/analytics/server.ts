/**
 * Серверный вход модуля analytics (ADR-0008).
 */
import 'server-only';

export { getAnalytics, listSalesPairs } from './server/service';

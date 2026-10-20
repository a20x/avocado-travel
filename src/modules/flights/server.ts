/**
 * Серверный вход модуля flights: только для серверных компонентов, actions и маршрутов (ADR-0008).
 */
import 'server-only';

export { searchFlights } from './server/service';

/**
 * Серверный вход модуля flights: только для серверных компонентов, actions и маршрутов (ADR-0008).
 */
import 'server-only';

export {
  getFlight,
  listAirlineStats,
  listDestinationStats,
  listRoutes,
  listSchedule,
  searchFlights,
} from './server/service';

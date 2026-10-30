/**
 * Серверный вход модуля flights: только для серверных компонентов, actions и маршрутов (ADR-0008).
 */
import 'server-only';

export {
  createFlights,
  deleteRoute,
  getFlight,
  listAirlineStats,
  listDestinationStats,
  listRoutes,
  listRoutesForAdmin,
  listSchedule,
  searchFlights,
} from './server/service';

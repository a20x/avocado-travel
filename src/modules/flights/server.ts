/**
 * Серверный вход модуля flights: только для серверных компонентов, actions и маршрутов (ADR-0008).
 */
import 'server-only';

export {
  createFlights,
  deleteRoute,
  getFlight,
  getFlightForEdit,
  getRouteFlights,
  listAirlineStats,
  listDestinationStats,
  listRoutes,
  listNearestSearchDates,
  listRoutesForAdmin,
  listSchedule,
  listSearchRoutes,
  searchFlights,
  updateFlight,
  updateRoute,
} from './server/service';
export type { RouteFlightsPage } from './server/service';

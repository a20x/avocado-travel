/**
 * Серверный вход модуля catalog-data: только для серверных компонентов, actions и маршрутов.
 * Импорт из клиентского компонента сломает сборку — так и задумано (ADR-0008).
 */
import 'server-only';

export {
  listAircraftModels,
  listAirlines,
  listAirports,
  listAirportsInCity,
} from './server/service';

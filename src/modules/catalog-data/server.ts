/**
 * Серверный вход модуля catalog-data: только для серверных компонентов, actions и маршрутов.
 * Импорт из клиентского компонента сломает сборку — так и задумано (ADR-0008).
 */
import 'server-only';

export {
  addReferenceValue,
  createAirline,
  createCity,
  deleteAirline,
  deleteCity,
  getAirlineForEdit,
  getCity,
  getCityForEdit,
  getReferenceLists,
  listAircraftModels,
  listAirlines,
  listAirlinesForAdmin,
  listAirports,
  listAirportsInCity,
  listCities,
  listCitiesForAdmin,
  updateAirline,
  updateCity,
} from './server/service';

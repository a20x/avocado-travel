/**
 * Модуль weather: баннер погоды по данным Open-Meteo (L1-12), страница «Погода» с поиском
 * любого города и списком «Мои города».
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/weather/server`,
 * компоненты — в `@/modules/weather/ui` (ADR-0008).
 */
export {
  CITY_QUERY_MAX,
  CITY_SEARCH_LIMIT,
  FORECAST_DAYS,
  MAX_SAVED_CITIES,
  addSavedCity,
  cityIdSchema,
  citySearchUrl,
  cityUrl,
  describeWeather,
  forecastUrl,
  formatTemperature,
  geoPlace,
  parseCity,
  parseCitySearch,
  parseForecast,
  parseSavedCities,
  removeSavedCity,
  weatherCityHref,
} from './model';
export type {
  CityWeather,
  DayForecast,
  GeoCity,
  SavedCitiesError,
  WeatherKind,
  WeatherPlace,
} from './model';

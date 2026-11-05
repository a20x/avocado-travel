/**
 * Модуль weather: баннер погоды по данным Open-Meteo (L1-12), страница «Погода» с поиском
 * любого города и списком «Мои города».
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/weather/server`,
 * компоненты — в `@/modules/weather/ui` (ADR-0008).
 */
export {
  CITY_QUERY_MAX,
  CITY_SEARCH_LIMIT,
  CITY_SUGGEST_MIN,
  FORECAST_DAYS,
  HOME_WEATHER_COUNT,
  MAX_SAVED_CITIES,
  addSavedCity,
  cityIdSchema,
  citySearchUrl,
  citySuggestQuery,
  cityUrl,
  describeWeather,
  forecastUrl,
  formatTemperature,
  geoPlace,
  homeWeatherPlaces,
  parseCity,
  parseCitySearch,
  parseForecast,
  parseSavedCities,
  removeSavedCity,
  setHomeCity,
  weatherCityHref,
} from './model';
export type {
  CityWeather,
  DayForecast,
  GeoCity,
  HomeCityError,
  SavedCitiesError,
  SavedCity,
  WeatherKind,
  WeatherPlace,
} from './model';

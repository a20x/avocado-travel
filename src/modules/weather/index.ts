/**
 * Модуль weather: баннер погоды по данным Open-Meteo (L1-12).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/weather/server`,
 * компоненты — в `@/modules/weather/ui` (ADR-0008).
 */
export {
  FORECAST_DAYS,
  describeWeather,
  forecastUrl,
  formatTemperature,
  parseForecast,
} from './model';
export type { CityWeather, DayForecast, WeatherKind, WeatherPlace } from './model';

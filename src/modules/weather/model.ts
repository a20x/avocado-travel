import { z } from 'zod';
import { fail, ok, type Result } from '@/shared/lib/result';

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

/** Город для прогноза. `href` — куда ведёт его название; без него — страница направления. */
export type WeatherPlace = { slug: string; name: string; lat: number; lon: number; href?: string };

export type DayForecast = { date: string; code: number; max: number; min: number };

export type CityWeather = {
  slug: string;
  name: string;
  href: string;
  temperature: number;
  /** Ощущается как, °C. */
  feelsLike: number;
  /** Влажность, %. */
  humidity: number;
  code: number;
  /** Ветер, м/с. */
  wind: number;
  /** Сегодня и следующие дни. */
  days: DayForecast[];
};

export const FORECAST_DAYS = 3;

/** Коды погоды WMO, которые отдаёт Open-Meteo: описание и значок. */
const CODES: Array<[number[], string, WeatherKind]> = [
  [[0], 'Ясно', 'clear'],
  [[1], 'Преимущественно ясно', 'partly'],
  [[2], 'Переменная облачность', 'partly'],
  [[3], 'Пасмурно', 'cloudy'],
  [[45, 48], 'Туман', 'fog'],
  [[51, 53, 55, 56, 57], 'Морось', 'rain'],
  [[61, 63, 65, 66, 67], 'Дождь', 'rain'],
  [[80, 81, 82], 'Ливень', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Снег', 'snow'],
  [[95, 96, 99], 'Гроза', 'storm'],
];

export function describeWeather(code: number): { label: string; kind: WeatherKind } {
  const found = CODES.find(([codes]) => codes.includes(code));
  return found ? { label: found[1], kind: found[2] } : { label: 'Облачно', kind: 'cloudy' };
}

/** «+12°», «−3°» (настоящий минус, а не дефис), «0°». */
export function formatTemperature(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}°`;
  if (rounded < 0) return `−${Math.abs(rounded)}°`;
  return '0°';
}

/** Один запрос на все города: Open-Meteo принимает координаты через запятую. */
export function forecastUrl(places: WeatherPlace[]): string {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.lat.toFixed(4)).join(','),
    longitude: places.map((p) => p.lon.toFixed(4)).join(','),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

const forecastSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number().int(),
    wind_speed_10m: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().int()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
  }),
});

/**
 * Ответ Open-Meteo → погода по городам в том же порядке. На один город сервис отвечает
 * объектом, на несколько — массивом. null — ответ не такой, как ожидали.
 */
export function parseForecast(json: unknown, places: WeatherPlace[]): CityWeather[] | null {
  const list = z.array(forecastSchema).safeParse(Array.isArray(json) ? json : [json]);
  if (!list.success || list.data.length !== places.length) return null;

  return list.data.map((forecast, i) => {
    const place = places[i] as WeatherPlace;
    const { daily } = forecast;
    return {
      slug: place.slug,
      name: place.name,
      href: place.href ?? `/destinations/${place.slug}`,
      temperature: forecast.current.temperature_2m,
      feelsLike: forecast.current.apparent_temperature,
      humidity: forecast.current.relative_humidity_2m,
      code: forecast.current.weather_code,
      wind: forecast.current.wind_speed_10m,
      days: daily.time.map((date, day) => ({
        date,
        code: daily.weather_code[day] ?? 3,
        max: daily.temperature_2m_max[day] ?? 0,
        min: daily.temperature_2m_min[day] ?? 0,
      })),
    };
  });
}

/**
 * Любой город мира — из геокодера Open-Meteo (база GeoNames, названия по-русски).
 * `area` — где он: область и страна, «Иль-де-Франс, Франция».
 */
export type GeoCity = { id: number; name: string; area: string; lat: number; lon: number };

/** Сколько городов можно отметить: список хранится в cookie, а она невелика. */
export const MAX_SAVED_CITIES = 10;
/** Сколько городов показывать по запросу. */
export const CITY_SEARCH_LIMIT = 10;
export const CITY_QUERY_MAX = 100;

/** Номер города в GeoNames — из адреса `/weather?city=…` и из форм «добавить» и «удалить». */
export const cityIdSchema = z.coerce.number().int().positive().max(2_147_483_647);

export const weatherCityHref = (id: number) => `/weather?city=${id}`;

/** Поиск города по названию или его началу: «пари» → Париж. */
export function citySearchUrl(name: string): string {
  const params = new URLSearchParams({
    name,
    count: String(CITY_SEARCH_LIMIT),
    language: 'ru',
    format: 'json',
  });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

export function cityUrl(id: number): string {
  return `https://geocoding-api.open-meteo.com/v1/get?${new URLSearchParams({ id: String(id), language: 'ru' })}`;
}

const geoResultSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  admin1: z.string().optional(),
  country: z.string().optional(),
});

function toGeoCity(result: z.infer<typeof geoResultSchema>): GeoCity {
  // У столиц область часто называется как город: «Москва, Москва, Россия» — повтор не нужен.
  const area = [result.admin1, result.country].filter(
    (part, i, parts): part is string => !!part && part !== result.name && parts.indexOf(part) === i,
  );
  return {
    id: result.id,
    name: result.name.slice(0, 100),
    area: area.join(', ').slice(0, 200),
    lat: result.latitude,
    lon: result.longitude,
  };
}

/**
 * Ответ поиска городов. Ничего не нашлось — геокодер отвечает без `results`: это пустой
 * список, а не ошибка. null — ответ не такой, как ожидали.
 */
export function parseCitySearch(json: unknown): GeoCity[] | null {
  const parsed = z.object({ results: z.array(z.unknown()).optional() }).safeParse(json);
  if (!parsed.success) return null;
  return (parsed.data.results ?? []).flatMap((item) => {
    const result = geoResultSchema.safeParse(item);
    return result.success ? [toGeoCity(result.data)] : [];
  });
}

/** Ответ на запрос города по номеру; null — такого нет или ответ неожиданный. */
export function parseCity(json: unknown): GeoCity | null {
  const result = geoResultSchema.safeParse(json);
  return result.success ? toGeoCity(result.data) : null;
}

const savedCitySchema = z.object({
  id: cityIdSchema,
  name: z.string().min(1).max(100),
  area: z.string().max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/**
 * «Мои города» из cookie. Её может изменить кто угодно в своём браузере, поэтому каждая запись
 * проверяется: битые отбрасываются, повторы и всё сверх MAX_SAVED_CITIES — тоже.
 */
export function parseSavedCities(json: unknown): GeoCity[] {
  if (!Array.isArray(json)) return [];
  const cities: GeoCity[] = [];
  for (const item of json) {
    const city = savedCitySchema.safeParse(item);
    if (city.success && !cities.some((c) => c.id === city.data.id)) cities.push(city.data);
  }
  return cities.slice(0, MAX_SAVED_CITIES);
}

export type SavedCitiesError = 'LIMIT';

/** Новый город — в конец списка; уже отмеченный — список не меняется. */
export function addSavedCity(
  cities: GeoCity[],
  city: GeoCity,
): Result<GeoCity[], SavedCitiesError> {
  if (cities.some((c) => c.id === city.id)) return ok(cities);
  if (cities.length >= MAX_SAVED_CITIES) return fail('LIMIT');
  return ok([...cities, city]);
}

export function removeSavedCity(cities: GeoCity[], id: number): GeoCity[] {
  return cities.filter((city) => city.id !== id);
}

/** Город из геокодера → место для прогноза; название ведёт на его погоду. */
export function geoPlace(city: GeoCity): WeatherPlace {
  return {
    slug: `geo-${city.id}`,
    name: city.name,
    lat: city.lat,
    lon: city.lon,
    href: weatherCityHref(city.id),
  };
}

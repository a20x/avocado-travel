import 'server-only';
import { cookies } from 'next/headers';
import { SITE_URL } from '@/shared/config/site';
import { fail, ok, type Result } from '@/shared/lib/result';
import { fetchExternal } from '@/server/external';
import {
  addSavedCity,
  cityUrl,
  citySearchUrl,
  forecastUrl,
  parseCity,
  parseCitySearch,
  parseForecast,
  parseSavedCities,
  removeSavedCity,
  type CityWeather,
  type GeoCity,
  type SavedCitiesError,
  type WeatherPlace,
} from '../model';

/**
 * Погода в городах из Open-Meteo (бесплатно, без ключа) или null, если сервис недоступен.
 * Хранится 30 минут (docs/03-architecture.md, «Рендеринг»).
 */
export async function getWeather(places: WeatherPlace[]): Promise<CityWeather[] | null> {
  if (places.length === 0) return [];
  const response = await fetchExternal(forecastUrl(places), { revalidate: 1800 });
  if (!response) return null;
  try {
    return parseForecast(await response.json(), places);
  } catch {
    return null;
  }
}

/** Ответ геокодера Open-Meteo: города меняются редко, поэтому он хранится сутки. */
async function geocode<T>(url: string, parse: (json: unknown) => T | null): Promise<T | null> {
  const response = await fetchExternal(url, { revalidate: 86_400 });
  if (!response) return null;
  try {
    return parse(await response.json());
  } catch {
    return null;
  }
}

/** Города по названию или его началу; null — геокодер недоступен. */
export function findCities(query: string): Promise<GeoCity[] | null> {
  return geocode(citySearchUrl(query), parseCitySearch);
}

/** Город по номеру GeoNames; null — такого нет или геокодер недоступен. */
export function getCity(id: number): Promise<GeoCity | null> {
  return geocode(cityUrl(id), parseCity);
}

/**
 * «Мои города» живут в cookie браузера (docs/03-architecture.md, «Рендеринг»): входить на сайт
 * не нужно, и всё работает даже без JavaScript. Внутри — JSON в base64url: так кириллица
 * занимает меньше места, чем в процентной записи, и десять городов помещаются в cookie.
 */
const COOKIE = 'weather_cities';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export async function getSavedCities(): Promise<GeoCity[]> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return [];
  try {
    return parseSavedCities(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  } catch {
    return [];
  }
}

async function storeSavedCities(cities: GeoCity[]): Promise<void> {
  const store = await cookies();
  if (cities.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, Buffer.from(JSON.stringify(cities)).toString('base64url'), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    // Читает cookie только сервер; на чужие сайты она не уходит.
    httpOnly: true,
    sameSite: 'lax',
    secure: SITE_URL.startsWith('https://'),
  });
}

export type SaveCityError = SavedCitiesError | 'NOT_FOUND';

/** Отметить город. Название и координаты берутся у геокодера, а не из формы. */
export async function saveCity(id: number): Promise<Result<null, SaveCityError>> {
  const city = await getCity(id);
  if (!city) return fail('NOT_FOUND');
  const result = addSavedCity(await getSavedCities(), city);
  if (!result.ok) return result;
  await storeSavedCities(result.data);
  return ok(null);
}

export async function forgetCity(id: number): Promise<void> {
  await storeSavedCities(removeSavedCity(await getSavedCities(), id));
}

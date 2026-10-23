import 'server-only';
import { fetchExternal } from '@/server/external';
import { forecastUrl, parseForecast, type CityWeather, type WeatherPlace } from '../model';

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

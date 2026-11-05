import 'server-only';
import { citySuggestQuery } from '../model';
import { findCities } from './service';

/**
 * GET /api/weather/cities?q=… — подсказки городов, пока посетитель печатает название на
 * странице «Погода»: `{ cities: [{ id, name, area }] }`. Служебный адрес сайта, а не публичный
 * API: закрыт от роботов в robots.txt (/api/). Геокодер недоступен — пустой список: поиск
 * кнопкой «Найти» скажет об этом сам.
 */
export async function handleCitySuggestRequest(request: Request): Promise<Response> {
  const query = citySuggestQuery(new URL(request.url).searchParams.get('q'));
  const found = query ? await findCities(query) : [];
  const cities = (found ?? []).map(({ id, name, area }) => ({ id, name, area }));
  // Города не меняются: пять минут в кэше браузера экономят запросы, пока человек стирает и печатает.
  return Response.json({ cities }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}

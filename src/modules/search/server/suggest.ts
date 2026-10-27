import 'server-only';
import { suggestSite } from './service';

/**
 * GET /api/search/suggest?q=… — подсказки для строки поиска в шапке: `{ suggestions: [...] }`.
 * Служебный адрес сайта, а не публичный API: закрыт от роботов в robots.txt (/api/).
 */
export async function handleSuggestRequest(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q');
  const suggestions = await suggestSite(q);
  // Индекс меняется редко: минута в кэше браузера экономит запросы, пока человек стирает и печатает.
  return Response.json({ suggestions }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}

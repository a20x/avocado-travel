import 'server-only';
import { hitInputSchema } from '../model';
import { getCounters, recordHit } from './service';

/**
 * Обработчик `src/app/api/stats/hit`: браузер сообщает об открытии страницы и получает
 * цифры для счётчика в подвале. Неразборчивый запрос не записывается, но цифры получает.
 */
export async function handleHitRequest(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Пустое или не-JSON тело — просто не записываем просмотр.
  }
  const parsed = hitInputSchema.safeParse(body);
  const counters = parsed.success
    ? await recordHit(parsed.data, request.headers.get('host'))
    : await getCounters();
  // Цифры у каждого свои и меняются каждую секунду — кэшировать нельзя.
  return Response.json(counters, { headers: { 'Cache-Control': 'no-store' } });
}

import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { env } from './env';

/**
 * Запрос пришёл от планировщика: заголовок `Authorization: Bearer <CRON_SECRET>`.
 * Сравнение за постоянное время — по времени ответа нельзя подобрать секрет посимвольно.
 */
export function isCronRequest(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

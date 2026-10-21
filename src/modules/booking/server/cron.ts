import 'server-only';
import { isCronRequest } from '@/server/cron';
import { expireStaleOrders } from './service';

/**
 * Обработчик задания «автоотмена неоплаченных заказов» для `src/app/api/cron/expire-orders`:
 * раз в 5 минут по расписанию хостинга (docs/03-architecture.md). Без секрета — 401.
 */
export async function handleExpireOrdersCron(request: Request): Promise<Response> {
  if (!isCronRequest(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({ expired: await expireStaleOrders() });
}

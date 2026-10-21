/**
 * Автоотмена неоплаченных заказов вручную, без расписания: `pnpm job:expire-orders`.
 * Делает то же, что маршрут /api/cron/expire-orders, но напрямую — сервер запускать не нужно.
 */
import { expireStaleOrders } from '@/modules/booking/server';
import { db } from '@/server/db';

expireStaleOrders()
  .then((count) => console.log(`Отменено просроченных заказов: ${count}`))
  .catch((error: unknown) => {
    console.error('Не удалось отменить заказы:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());

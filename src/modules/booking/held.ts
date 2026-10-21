import { and, eq, gt, or } from 'drizzle-orm';
import { orders, tickets } from './schema';

/**
 * Условие «билет держит место» — для запросов с `tickets JOIN orders`: билет действует и заказ
 * оплачен или ещё ждёт оплаты, но не просрочен. Просроченный неоплаченный заказ мест не держит,
 * даже если автоотмена до него ещё не добралась (docs/03-architecture.md, «Задания по расписанию»).
 * Одно определение на весь сайт: им пользуются и бронирование, и занятость мест в поиске.
 */
export function ticketHoldsSeat(now: Date) {
  return and(
    eq(tickets.isActive, true),
    or(eq(orders.status, 'paid'), and(eq(orders.status, 'pending'), gt(orders.expiresAt, now))),
  );
}

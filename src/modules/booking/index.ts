/**
 * Модуль booking: заказы, билеты, демо-оплата.
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/booking/server`,
 * формы — в `@/modules/booking/ui` (ADR-0008).
 */

/** Таблицы публикуются для чтения в чужих репозиториях: занятость мест в flights (ADR-0007). */
export { cabinClass, orderStatus, orders, tickets } from './schema';
export { ticketHoldsSeat } from './held';

export {
  ORDER_HOLD_MINUTES,
  bookingRequestSchema,
  canCancel,
  cardSchema,
  createOrderSchema,
  passengerSchema,
} from './model';
export type {
  BookingError,
  BookingRequest,
  CreateOrderInput,
  Order,
  OrderDetails,
  OrderError,
  OrderStatus,
  Passenger,
  PricedSeat,
  Ticket,
} from './model';
export { generatePnr, isPnr } from './pnr';

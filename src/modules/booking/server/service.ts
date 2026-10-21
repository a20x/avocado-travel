import 'server-only';
import { z } from 'zod';
import type { FlightDetails } from '@/modules/flights';
import { getFlight } from '@/modules/flights/server';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  ORDER_HOLD_MINUTES,
  bookingRequestSchema,
  canCancel,
  type BookingError,
  type BookingRequest,
  type CreateOrderInput,
  type OrderDetails,
  type OrderError,
  type PricedSeat,
} from '../model';
import { generatePnr } from '../pnr';
import { priceSeats, totalOf } from '../pricing';
import * as repository from './repository';

/** Черновик брони: что выбрано и сколько стоит — для страницы с данными пассажиров. */
export type BookingDraft = {
  request: BookingRequest;
  flight: FlightDetails;
  seats: PricedSeat[];
  total: number;
};

/**
 * Проверяет выбор со схемы салона: рейс есть и не улетел, места существуют, нужного класса
 * и свободны. Цены считаются здесь, по данным сервера.
 */
export async function prepareBooking(
  input: unknown,
  now: Date = new Date(),
): Promise<Result<BookingDraft, BookingError>> {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) return fail('INVALID_REQUEST');
  const request = parsed.data;

  const flight = await getFlight(request.flight, now);
  if (!flight.ok) return fail('FLIGHT_NOT_FOUND');
  if (flight.data.isDeparted) return fail('FLIGHT_DEPARTED');

  const seats = priceSeats(flight.data.seatMap, request.cabinClass, request.seats);
  if (!seats.ok) return fail(seats.error);

  return ok({ request, flight: flight.data, seats: seats.data, total: totalOf(seats.data) });
}

/** Сколько раз пробовать новый код брони, если случайный совпал с существующим. */
const PNR_ATTEMPTS = 5;

/**
 * Создаёт заказ в статусе `pending`: места держатся 15 минут до оплаты.
 * Два покупателя, одновременно выбравшие одно место, — один получит заказ, другой SEAT_UNAVAILABLE.
 */
export async function createOrder(
  userId: string,
  input: CreateOrderInput,
  now: Date = new Date(),
): Promise<Result<{ orderId: string }, BookingError>> {
  const draft = await prepareBooking(input, now);
  if (!draft.ok) return draft;

  const passengers = input.passengers;
  const order = {
    userId,
    total: draft.data.total,
    expiresAt: new Date(now.getTime() + ORDER_HOLD_MINUTES * 60_000),
    flightId: draft.data.flight.id,
    cabinClass: draft.data.request.cabinClass,
    tickets: draft.data.seats.map((seat, i) => ({
      seat: seat.seat,
      price: seat.price,
      firstName: passengers[i]?.firstName ?? '',
      lastName: passengers[i]?.lastName ?? '',
    })),
  };

  for (let attempt = 0; attempt < PNR_ATTEMPTS; attempt++) {
    const result = await repository.insertOrder({ ...order, pnr: generatePnr() }, now);
    if (result.ok) return ok({ orderId: result.id });
    if (result.error === 'SEAT_TAKEN') return fail('SEAT_UNAVAILABLE');
  }
  throw new Error('Не удалось подобрать свободный код брони');
}

/** Заказ пользователя. Просроченный неоплаченный к этому моменту уже отменён. */
export async function getOrder(
  userId: string,
  orderId: unknown,
  now: Date = new Date(),
): Promise<Result<OrderDetails, 'ORDER_NOT_FOUND'>> {
  const id = z.uuid().safeParse(orderId);
  if (!id.success) return fail('ORDER_NOT_FOUND');
  await repository.expireOrders(now);
  const order = await repository.findOrderForUser(userId, id.data);
  return order ? ok(order) : fail('ORDER_NOT_FOUND');
}

/**
 * Демо-оплата: карта уже проверена на формате, здесь — только смена статуса.
 * Оплатить можно свой заказ, который ещё ждёт оплаты и не просрочен.
 */
export async function payOrder(
  userId: string,
  orderId: string,
  now: Date = new Date(),
): Promise<Result<null, OrderError>> {
  await repository.expireOrders(now);
  if (await repository.markPaid(userId, orderId, now)) return ok(null);

  const order = await repository.findOrderForUser(userId, orderId);
  if (!order) return fail('ORDER_NOT_FOUND');
  return fail(order.status === 'cancelled' ? 'ORDER_EXPIRED' : 'ORDER_NOT_PENDING');
}

/** Заказы покупателя для личного кабинета, новые сверху. */
export async function listOrders(userId: string, now: Date = new Date()): Promise<OrderDetails[]> {
  await repository.expireOrders(now);
  return repository.findOrdersForUser(userId);
}

/** Отмена брони покупателем: места освобождаются. Оплата демонстрационная — возвращать нечего. */
export async function cancelOrder(
  userId: string,
  orderId: unknown,
  now: Date = new Date(),
): Promise<Result<null, OrderError>> {
  const id = z.uuid().safeParse(orderId);
  if (!id.success) return fail('ORDER_NOT_FOUND');
  const order = await repository.findOrderForUser(userId, id.data);
  if (!order) return fail('ORDER_NOT_FOUND');
  if (!canCancel(order, now)) return fail('ORDER_NOT_CANCELLABLE');
  // false — заказ успели отменить или он истёк, пока покупатель подтверждал отмену.
  return (await repository.cancelOrder(userId, id.data, now))
    ? ok(null)
    : fail('ORDER_NOT_CANCELLABLE');
}

/** Автоотмена просроченных неоплаченных заказов — для задания по расписанию. Возвращает их число. */
export function expireStaleOrders(now: Date = new Date()): Promise<number> {
  return repository.expireOrders(now);
}

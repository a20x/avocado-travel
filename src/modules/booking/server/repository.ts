import 'server-only';
import { and, asc, eq, gt, inArray, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { airlines, airports, type CabinClass } from '@/modules/catalog-data';
import { flights } from '@/modules/flights';
import { db } from '@/server/db';
import type { OrderDetails } from '../model';
import { orders, tickets } from '../schema';

type Executor = Pick<typeof db, 'update' | 'select' | 'insert'>;

/**
 * Отменяет просроченные неоплаченные заказы и освобождает их места.
 * Вызывается перед созданием заказа, при открытии брони и (в T-14) по расписанию.
 */
export async function expireOrders(now: Date, executor: Executor = db): Promise<number> {
  const expired = await executor
    .update(orders)
    .set({ status: 'cancelled', cancelledAt: now })
    .where(and(eq(orders.status, 'pending'), lte(orders.expiresAt, now)))
    .returning({ id: orders.id });
  if (expired.length > 0) {
    await executor
      .update(tickets)
      .set({ isActive: false })
      .where(
        inArray(
          tickets.orderId,
          expired.map((order) => order.id),
        ),
      );
  }
  return expired.length;
}

export type NewOrder = {
  userId: string;
  pnr: string;
  total: number;
  expiresAt: Date;
  flightId: string;
  cabinClass: CabinClass;
  tickets: Array<{ seat: string; price: number; firstName: string; lastName: string }>;
};

/** Имя ограничения, нарушение которого вызвало ошибку уникальности в PostgreSQL, или null. */
function uniqueViolation(error: unknown): string | null {
  // Drizzle заворачивает ошибку драйвера: настоящая лежит в cause.
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const pg = e as Error & { code?: string; constraint?: string };
    if (pg.code === '23505') return pg.constraint ?? '';
  }
  return null;
}

/**
 * Заказ с билетами — одной транзакцией: или всё, или ничего.
 * Если место за это время купил кто-то другой, сработает уникальный индекс и вернётся SEAT_TAKEN.
 */
export async function insertOrder(
  order: NewOrder,
  now: Date,
): Promise<{ ok: true; id: string } | { ok: false; error: 'SEAT_TAKEN' | 'PNR_TAKEN' }> {
  try {
    const id = await db.transaction(async (tx) => {
      // Места просроченных броней освобождаются до вставки, иначе индекс их не отдаст.
      await expireOrders(now, tx);
      const [created] = await tx
        .insert(orders)
        .values({
          userId: order.userId,
          pnr: order.pnr,
          total: order.total,
          expiresAt: order.expiresAt,
          createdAt: now,
        })
        .returning({ id: orders.id });
      if (!created) throw new Error('Заказ не создан');
      await tx.insert(tickets).values(
        order.tickets.map((ticket) => ({
          orderId: created.id,
          flightId: order.flightId,
          cabinClass: order.cabinClass,
          seat: ticket.seat,
          passengerFirstName: ticket.firstName,
          passengerLastName: ticket.lastName,
          price: ticket.price,
        })),
      );
      return created.id;
    });
    return { ok: true, id };
  } catch (error) {
    const constraint = uniqueViolation(error);
    if (constraint === 'tickets_active_seat_unique') return { ok: false, error: 'SEAT_TAKEN' };
    if (constraint === 'orders_pnr_unique') return { ok: false, error: 'PNR_TAKEN' };
    throw error;
  }
}

const origin = alias(airports, 'origin');
const destination = alias(airports, 'destination');

/** Заказ пользователя с билетами и рейсом. Чужой заказ не найдётся — как и несуществующий. */
export async function findOrderForUser(
  userId: string,
  orderId: string,
): Promise<OrderDetails | null> {
  const [order] = await db
    .select({
      id: orders.id,
      pnr: orders.pnr,
      status: orders.status,
      total: orders.total,
      expiresAt: orders.expiresAt,
      paidAt: orders.paidAt,
      cancelledAt: orders.cancelledAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  if (!order) return null;

  const rows = await db
    .select({
      seat: tickets.seat,
      passengerFirstName: tickets.passengerFirstName,
      passengerLastName: tickets.passengerLastName,
      price: tickets.price,
      cabinClass: tickets.cabinClass,
      flight: {
        id: flights.id,
        number: flights.number,
        airlineName: airlines.name,
        departsAt: flights.departsAt,
        arrivesAt: flights.arrivesAt,
      },
      origin: { city: origin.city, iata: origin.iata, timezone: origin.timezone },
      destination: {
        city: destination.city,
        iata: destination.iata,
        timezone: destination.timezone,
      },
    })
    .from(tickets)
    .innerJoin(flights, eq(tickets.flightId, flights.id))
    .innerJoin(airlines, eq(flights.airlineId, airlines.id))
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .where(eq(tickets.orderId, order.id))
    .orderBy(asc(tickets.seat));

  const first = rows[0];
  if (!first) return null;
  return {
    ...order,
    cabinClass: first.cabinClass,
    tickets: rows.map(({ seat, passengerFirstName, passengerLastName, price }) => ({
      seat,
      passengerFirstName,
      passengerLastName,
      price,
    })),
    flight: { ...first.flight, origin: first.origin, destination: first.destination },
  };
}

/** Отмечает заказ оплаченным, если он ещё ждёт оплаты и не просрочен. true — получилось. */
export async function markPaid(userId: string, orderId: string, now: Date): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ status: 'paid', paidAt: now })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, userId),
        eq(orders.status, 'pending'),
        gt(orders.expiresAt, now),
      ),
    )
    .returning({ id: orders.id });
  return updated.length > 0;
}

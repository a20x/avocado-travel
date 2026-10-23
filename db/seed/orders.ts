import { eq, inArray, sql } from 'drizzle-orm';
import { users } from '@/modules/auth';
import { orders, tickets } from '@/modules/booking';
import { aircraftModels, airports } from '@/modules/catalog-data';
import { flights } from '@/modules/flights';
import type { Db } from './db';
import { planSales } from './sales';

/** Postgres принимает до 65 535 параметров в запросе — вставляем пачками. */
const CHUNK = 1000;

function chunks<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) =>
    items.slice(i * CHUNK, (i + 1) * CHUNK),
  );
}

/**
 * Демо-покупатели и их заказы за полгода (docs/04-data-model.md, «Демо-данные»).
 * Покупатели — без пароля: войти под ними нельзя, они нужны только для отчётов аналитики.
 * Как и авторы форума, они не удаляются между запусками, а создаются, если их ещё нет.
 */
export async function seedOrders(
  db: Db,
  today: string,
): Promise<{ customers: number; orders: number; tickets: number }> {
  // Запросы по очереди: внутри транзакции у сида одно соединение.
  const flightRows = await db
    .select({
      id: flights.id,
      departsAt: flights.departsAt,
      durationMinutes: sql<number>`(extract(epoch from ${flights.arrivesAt} - ${flights.departsAt}) / 60)::int`,
      destination: airports.citySlug,
      priceEconomy: flights.priceEconomy,
      priceBusiness: flights.priceBusiness,
      aircraftModelId: flights.aircraftModelId,
    })
    .from(flights)
    .innerJoin(airports, eq(airports.id, flights.destinationId))
    // Стабильный порядок — иначе одинаковый seed дал бы разные заказы.
    .orderBy(flights.departsAt, flights.number);
  const models = await db.select().from(aircraftModels);

  const plan = planSales(flightRows, models, today);

  for (const part of chunks(plan.customers)) {
    await db
      .insert(users)
      .values(
        part.map((customer) => ({ id: crypto.randomUUID(), emailVerified: true, ...customer })),
      )
      .onConflictDoNothing({ target: users.email });
  }
  const idByEmail = new Map<string, string>();
  for (const part of chunks(plan.customers)) {
    const rows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        inArray(
          users.email,
          part.map((customer) => customer.email),
        ),
      );
    for (const row of rows) idByEmail.set(row.email, row.id);
  }

  let ticketCount = 0;
  for (const part of chunks(plan.orders)) {
    const inserted = await db
      .insert(orders)
      .values(
        part.map((order) => ({
          userId: idByEmail.get(plan.customers[order.customer]?.email ?? '') ?? '',
          pnr: order.pnr,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          expiresAt: order.expiresAt,
          paidAt: order.paidAt,
          cancelledAt: order.cancelledAt,
        })),
      )
      .returning({ id: orders.id });
    const rows = part.flatMap((order, i) =>
      order.tickets.map((ticket) => ({ ...ticket, orderId: inserted[i]?.id ?? '' })),
    );
    for (const ticketPart of chunks(rows)) await db.insert(tickets).values(ticketPart);
    ticketCount += rows.length;
  }

  return { customers: plan.customers.length, orders: plan.orders.length, tickets: ticketCount };
}

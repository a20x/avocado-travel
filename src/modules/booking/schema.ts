import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '@/modules/auth';
import { flights } from '@/modules/flights';

export const orderStatus = pgEnum('order_status', ['pending', 'paid', 'cancelled']);
export const cabinClass = pgEnum('cabin_class', ['economy', 'business']);

/** Заказы (docs/04-data-model.md). Сумма — копейки, время — UTC. */
export const orders = pgTable(
  'orders',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Код брони: 6 символов без похожих (src/modules/booking/pnr.ts). */
    pnr: char({ length: 6 }).notNull().unique(),
    status: orderStatus().notNull().default('pending'),
    total: integer().notNull(),
    /** До какого момента неоплаченный заказ держит места. */
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    paidAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.userId, table.createdAt),
    // Для автоотмены: быстро найти просроченные неоплаченные заказы.
    index().on(table.status, table.expiresAt),
    check('orders_total_positive', sql`${table.total} > 0`),
  ],
);

/** Билеты: одно место одного пассажира на рейсе. */
export const tickets = pgTable(
  'tickets',
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    flightId: uuid()
      .notNull()
      .references(() => flights.id),
    cabinClass: cabinClass().notNull(),
    seat: text().notNull(),
    passengerFirstName: text().notNull(),
    passengerLastName: text().notNull(),
    /** Цена, зафиксированная при оформлении; дальше не меняется. */
    price: integer().notNull(),
    /** false — заказ отменён, место снова свободно. */
    isActive: boolean().notNull().default(true),
  },
  (table) => [
    // Главная защита от двойной продажи: одно место — один действующий билет.
    // Её даёт база, поэтому она работает и при одновременных нажатиях «Забронировать».
    uniqueIndex('tickets_active_seat_unique')
      .on(table.flightId, table.seat)
      .where(sql`${table.isActive}`),
    index().on(table.orderId),
    check('tickets_price_positive', sql`${table.price} > 0`),
  ],
);

import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const adPlacement = pgEnum('ad_placement', ['home', 'search']);
export const adEventType = pgEnum('ad_event_type', ['impression', 'click']);

/**
 * Рекламные кампании (docs/04-data-model.md). Период показа — [starts_at, ends_at):
 * в форме админки дата окончания включительная, в базе хранится начало следующего дня.
 */
export const adCampaigns = pgTable(
  'ad_campaigns',
  {
    id: serial().primaryKey(),
    title: text().notNull(),
    text: text().notNull(),
    /** Картинка из public/images/ads. */
    image: text().notNull(),
    /** Внешний адрес `https://…` или страница сайта `/…`. */
    targetUrl: text().notNull(),
    placement: adPlacement().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    isEnabled: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index().on(table.placement, table.startsAt),
    check('ad_campaigns_period', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

/** Показы и клики: каждое событие — строка, отчёты считают их по периодам. */
export const adEvents = pgTable(
  'ad_events',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    campaignId: integer()
      .notNull()
      .references(() => adCampaigns.id, { onDelete: 'cascade' }),
    type: adEventType().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.campaignId, table.type, table.createdAt)],
);

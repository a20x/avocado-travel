import { generatePnr } from '@/modules/booking';
import { buildSeatMap } from '@/modules/flights';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import { createRandom } from './schedule';

/**
 * Демо-продажи за полгода (L3-01) — данные для отчётов аналитики. Здесь только расчёт,
 * без базы: из рейсов и моделей самолётов получаются покупатели, заказы и билеты.
 * Запись в базу — в orders.ts. Генерация детерминированная: тот же день — те же данные.
 */

export type SalesFlight = {
  id: string;
  departsAt: Date;
  durationMinutes: number;
  destination: string;
  priceEconomy: number;
  priceBusiness: number;
  aircraftModelId: number;
};

export type SalesModel = {
  id: number;
  businessRows: number;
  businessLayout: string;
  economyRows: number;
  economyLayout: string;
};

export type DemoCustomer = { email: string; name: string; createdAt: Date };

export type DemoTicket = {
  flightId: string;
  cabinClass: 'economy' | 'business';
  seat: string;
  passengerFirstName: string;
  passengerLastName: string;
  price: number;
  isActive: boolean;
};

export type DemoOrder = {
  customer: number;
  pnr: string;
  status: 'paid' | 'cancelled';
  total: number;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
  cancelledAt: Date | null;
  tickets: DemoTicket[];
};

/** Сколько дней истории и сколько покупателей (docs/04-data-model.md). */
export const SALES_DAYS = 180;
export const CUSTOMER_COUNT = 5000;
/** Заказов в обычный будний день без сезонных поправок. */
const BASE_ORDERS_PER_DAY = 140;
const CANCEL_SHARE = 0.08;
const HOLD_MINUTES = 15;
const TIMEZONE = 'Europe/Moscow';

/** Сезонность по месяцам продажи: пик — летние отпуска и новогодние праздники. */
// prettier-ignore
export const MONTH_FACTOR = [0.8, 0.75, 0.85, 0.9, 1.05, 1.25, 1.4, 1.35, 1.0, 0.9, 0.8, 1.15];
/** День недели продажи (0 — воскресенье): в будни покупают чаще, в выходные — реже. */
export const WEEKDAY_FACTOR = [0.85, 1, 1, 1, 1.05, 1.1, 0.8];

/**
 * Популярность направлений: море, Калининград и Петербург — чаще остальных. У Москвы вес
 * ниже: в неё возвращаются рейсы из всех городов, без поправки она заняла бы весь топ.
 */
// prettier-ignore
const DESTINATION_WEIGHT: Record<string, number> = {
  sochi: 2.6, kaliningrad: 2.1, 'saint-petersburg': 2, moscow: 0.7, kazan: 1.5, istanbul: 1.5,
  'mineralnye-vody': 1.3, yerevan: 1.2, dubai: 1.2, yekaterinburg: 1.1, novosibirsk: 1,
};
/** Куда летом летают особенно охотно (июнь–август). */
const SUMMER_DESTINATIONS = new Set(['sochi', 'kaliningrad', 'mineralnye-vody', 'istanbul']);

// prettier-ignore
const MALE = { first: ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Алексей', 'Иван', 'Михаил', 'Никита', 'Егор', 'Артём', 'Павел', 'Роман', 'Олег', 'Тимур'], last: ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Соловьёв', 'Васильев', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров'] };
// prettier-ignore
const FEMALE_FIRST = ['Анна', 'Мария', 'Елена', 'Ольга', 'Наталья', 'Екатерина', 'Ирина', 'Татьяна', 'Светлана', 'Дарья', 'Полина', 'Алина', 'Ксения', 'Виктория', 'Юлия'];

type Random = () => number;
type Person = { first: string; last: string };

const pick = <T>(random: Random, items: readonly T[]): T =>
  items[Math.floor(random() * items.length)] as T;

function person(random: Random, last = pick(random, MALE.last)): Person {
  // Фамилии в списке мужские: женская форма — с «а» на конце (Иванов → Иванова).
  return random() < 0.5
    ? { first: pick(random, MALE.first), last }
    : { first: pick(random, FEMALE_FIRST), last: `${last}а` };
}

/** Сколько пассажиров в заказе: чаще всего летят одни или вдвоём. */
export function passengersCount(random: Random): number {
  const r = random();
  return r < 0.55 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4;
}

/** За сколько дней до вылета покупают: чаще за 1–3 недели, иногда в последний момент. */
function leadDays(random: Random): number {
  return 1 + Math.min(44, Math.floor(-Math.log(1 - random()) * 14));
}

/** Сколько заказов в этот день: сезон, день недели, рост сайта к сегодняшнему дню и разброс. */
export function ordersOnDay(date: string, daysAgo: number, random: Random): number {
  const at = new Date(`${date}T12:00:00Z`);
  const growth = 0.55 + 0.65 * (1 - daysAgo / SALES_DAYS);
  const noise = 0.8 + random() * 0.4;
  const factor =
    (MONTH_FACTOR[at.getUTCMonth()] ?? 1) * (WEEKDAY_FACTOR[at.getUTCDay()] ?? 1) * growth;
  return Math.round(BASE_ORDERS_PER_DAY * factor * noise);
}

function flightWeight(flight: SalesFlight): number {
  const month = flight.departsAt.getUTCMonth();
  const summer = month >= 5 && month <= 7 && SUMMER_DESTINATIONS.has(flight.destination);
  return (DESTINATION_WEIGHT[flight.destination] ?? 0.8) * (summer ? 1.6 : 1);
}

/** Взвешенный выбор: элемент с весом 2 выпадает вдвое чаще элемента с весом 1. */
function weightedPick<T>(random: Random, items: T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = random() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items.at(-1);
}

type SeatRow = { cabinClass: 'economy' | 'business'; seats: Array<{ id: string; price: number }> };

/**
 * Места для компании пассажиров: по возможности рядом, в одном ряду. Цена — по схеме салона
 * рейса, как на сайте: базовая цена класса плюс доплата за место для ног.
 */
function chooseSeats(
  random: Random,
  rows: SeatRow[],
  taken: Set<string>,
  count: number,
): Array<{ id: string; price: number }> | null {
  const free = rows
    .map((row) => row.seats.filter((seat) => !taken.has(seat.id)))
    .filter((seats) => seats.length > 0);
  if (free.reduce((sum, seats) => sum + seats.length, 0) < count) return null;
  const chosen: Array<{ id: string; price: number }> = [];
  // Обычно садятся вместе: ряд, где хватает мест на всех; иначе — куда придётся.
  const together = free.filter((seats) => seats.length >= count);
  let rowSeats = together.length > 0 ? pick(random, together) : pick(random, free);
  while (chosen.length < count) {
    const seat = rowSeats.find((item) => !taken.has(item.id) && !chosen.includes(item));
    if (seat) chosen.push(seat);
    else rowSeats = pick(random, free);
  }
  return chosen;
}

/**
 * Покупатели и заказы за `SALES_DAYS` дней до `today` (дата по Москве, не включая сам день).
 * Покупают и на рейсы, которые ещё не улетели, — поэтому `flights` охватывают и будущее.
 */
export function planSales(
  flights: SalesFlight[],
  models: SalesModel[],
  today: string,
  seed = 20260423,
): { customers: DemoCustomer[]; orders: DemoOrder[] } {
  const random = createRandom(seed);
  const start = addDays(today, -SALES_DAYS);
  // Всё, что случилось с заказами (оплата, отмена), — до начала сегодняшнего дня.
  const todayStart = zonedTimeToUtc(today, '00:00', TIMEZONE).getTime();

  const customers: DemoCustomer[] = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
    const { first, last } = person(random);
    const registered = addDays(start, -Math.floor(random() * 60));
    return {
      email: `customer-${String(i + 1).padStart(4, '0')}@demo.avocado.local`,
      name: `${first} ${last}`,
      createdAt: zonedTimeToUtc(registered, '12:00', TIMEZONE),
    };
  });

  // Ряды салона каждой модели с ценами кресел — один раз на модель и пару цен.
  const cabinCache = new Map<string, SeatRow[]>();
  const cabinOf = (flight: SalesFlight): SeatRow[] => {
    const key = `${flight.aircraftModelId}:${flight.priceEconomy}:${flight.priceBusiness}`;
    let rows = cabinCache.get(key);
    if (!rows) {
      const model = models.find((item) => item.id === flight.aircraftModelId);
      if (!model) throw new Error(`Нет модели самолёта ${flight.aircraftModelId}`);
      rows = buildSeatMap(
        model,
        { economy: flight.priceEconomy, business: flight.priceBusiness },
        new Set(),
      ).map((row) => ({ cabinClass: row.cabinClass, seats: row.groups.flat() }));
      cabinCache.set(key, rows);
    }
    return rows;
  };

  const flightsByDay = new Map<string, SalesFlight[]>();
  for (const flight of flights) {
    const day = flight.departsAt.toISOString().slice(0, 10);
    const list = flightsByDay.get(day);
    if (list) list.push(flight);
    else flightsByDay.set(day, [flight]);
  }

  const takenSeats = new Map<string, Set<string>>();
  const pnrs = new Set<string>();
  const randomBytes = (bytes: Uint8Array) => bytes.map(() => Math.floor(random() * 256));
  const orders: DemoOrder[] = [];

  for (let daysAgo = SALES_DAYS; daysAgo >= 1; daysAgo--) {
    const date = addDays(today, -daysAgo);
    const count = ordersOnDay(date, daysAgo, random);
    for (let n = 0; n < count; n++) {
      const minutes = 8 * 60 + Math.floor(random() * 16 * 60); // покупают с 8:00 до полуночи
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      const createdAt = zonedTimeToUtc(date, time, TIMEZONE);
      const candidates = flightsByDay.get(addDays(date, leadDays(random))) ?? [];
      const flight = weightedPick(random, candidates, flightWeight);
      // За пару часов до вылета билеты уже не продаются.
      if (!flight || flight.departsAt.getTime() - createdAt.getTime() < 2 * 3_600_000) continue;

      // Бизнес-класс берут реже, на долгих рейсах — чаще.
      const businessShare = flight.durationMinutes > 240 ? 0.14 : 0.06;
      const cabinClass = random() < businessShare ? 'business' : 'economy';
      const passengers = passengersCount(random);
      const taken = takenSeats.get(flight.id) ?? new Set<string>();
      const rows = cabinOf(flight).filter((row) => row.cabinClass === cabinClass);
      const seats = chooseSeats(random, rows, taken, passengers);
      if (!seats) continue;
      for (const seat of seats) taken.add(seat.id);
      takenSeats.set(flight.id, taken);

      const customer = Math.floor(CUSTOMER_COUNT * random() ** 1.6); // есть постоянные клиенты
      const [buyerFirst = '', buyerLast = ''] = customers[customer]?.name.split(' ') ?? [];
      const family = random() < 0.6;
      const isCancelled = random() < CANCEL_SHARE;
      const tickets = seats.map((seat, index): DemoTicket => {
        const passenger =
          index === 0
            ? { first: buyerFirst, last: buyerLast }
            : person(random, family ? buyerLast.replace(/а$/, '') : undefined);
        return {
          flightId: flight.id,
          cabinClass,
          seat: seat.id,
          passengerFirstName: passenger.first,
          passengerLastName: passenger.last,
          price: seat.price,
          isActive: !isCancelled,
        };
      });

      let pnr = generatePnr(randomBytes);
      while (pnrs.has(pnr)) pnr = generatePnr(randomBytes);
      pnrs.add(pnr);

      const paidAt = new Date(createdAt.getTime() + (2 + Math.floor(random() * 12)) * 60_000);
      const cancelWindow = Math.max(
        0,
        Math.min(flight.departsAt.getTime() - paidAt.getTime(), todayStart - paidAt.getTime()),
      );
      orders.push({
        customer,
        pnr,
        status: isCancelled ? 'cancelled' : 'paid',
        total: tickets.reduce((sum, ticket) => sum + ticket.price, 0),
        createdAt,
        expiresAt: new Date(createdAt.getTime() + HOLD_MINUTES * 60_000),
        // Отменяют чаще всего оплаченные заказы — где-то между оплатой и вылетом.
        paidAt,
        cancelledAt: isCancelled
          ? new Date(paidAt.getTime() + Math.floor(random() * cancelWindow * 0.9))
          : null,
        tickets,
      });
    }
  }
  return { customers, orders };
}

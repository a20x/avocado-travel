import { z } from 'zod';
import { addDays, daysBetween, zonedTimeToUtc } from '@/shared/lib/time';
import type { flights } from './schema';

/**
 * Расписание рейсов: расчёт времени в пути и цены по расстоянию (ими пользуется и генератор
 * демо-данных) и рейсы, которые администратор заводит в админке. Чистые функции, без базы.
 */

type Point = { lat: number; lon: number };

/** Расстояние между точками по поверхности Земли (формула гаверсинусов), км. */
export function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Время в пути: крейсерская скорость ~780 км/ч плюс 35 минут на взлёт и посадку, кратно 5 минутам. */
export function flightMinutes(km: number): number {
  return roundTo((km / 780) * 60 + 35, 5);
}

/** Бизнес дороже эконома в 2,7 раза. */
const BUSINESS_FACTOR = 2.7;

/** Базовые цены в копейках: растут с расстоянием, бизнес — в 2,7 раза дороже, кратно 100 ₽. */
export function basePrices(km: number, factor = 1): { economy: number; business: number } {
  const economyRub = roundTo((1900 + km * 2.9) * factor, 100);
  return { economy: economyRub * 100, business: roundTo(economyRub * BUSINESS_FACTOR, 100) * 100 };
}

/** День недели местной даты: 1 — понедельник … 7 — воскресенье. */
export function weekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

/** На сколько дней вперёд можно завести рейсы за один раз. */
export const MAX_SCHEDULE_DAYS = 180;

/** Сколько минут самолёт стоит в аэропорту прилёта перед обратным рейсом. */
export const TURNAROUND_MINUTES = 90;

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Необязательное целое из поля формы: пустое — «посчитать самим». */
const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === '' ? undefined : Number(value)))
    .pipe(z.number(message).int(message).min(min, message).max(max, message).optional());

/**
 * Форма «Добавить рейсы»: ежедневный рейс в одно и то же местное время по выбранным дням
 * недели. Время в пути и цены необязательны — без них считаются по расстоянию.
 */
export const flightScheduleSchema = z
  .object({
    airline: z.string().regex(/^[A-Z]{3}$/, 'Выберите авиакомпанию'),
    origin: z.string().regex(/^[A-Z]{3}$/, 'Выберите аэропорт вылета'),
    destination: z.string().regex(/^[A-Z]{3}$/, 'Выберите аэропорт прилёта'),
    aircraftModelId: z.coerce.number('Выберите самолёт').int().positive('Выберите самолёт'),
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Укажите время вылета'),
    dateFrom: z.iso.date('Укажите дату'),
    dateTo: z.iso.date('Укажите дату'),
    weekdays: z
      .array(z.coerce.number().int().min(1).max(7))
      .min(1, 'Отметьте хотя бы один день недели'),
    durationMinutes: optionalInt(20, 1200, 'От 20 до 1200 минут'),
    priceEconomy: optionalInt(100, 1_000_000, 'От 100 до 1 000 000 ₽'),
    priceBusiness: optionalInt(100, 1_000_000, 'От 100 до 1 000 000 ₽'),
    withReturn: z.string().transform((value) => value === 'on'),
  })
  .refine((input) => input.origin !== input.destination, {
    path: ['destination'],
    message: 'Аэропорты вылета и прилёта совпадают',
  })
  .refine((input) => input.dateTo >= input.dateFrom, {
    path: ['dateTo'],
    message: 'Конец периода раньше начала',
  })
  // Zod проверяет форму целиком, даже если отдельные поля уже с ошибкой: пустую дату не считаем.
  .refine(
    (input) =>
      !isDate(input.dateFrom) ||
      !isDate(input.dateTo) ||
      daysBetween(input.dateFrom, input.dateTo) < MAX_SCHEDULE_DAYS,
    {
      path: ['dateTo'],
      message: `Не больше ${MAX_SCHEDULE_DAYS} дней за один раз`,
    },
  )
  .refine(
    (input) =>
      input.priceEconomy === undefined ||
      input.priceBusiness === undefined ||
      input.priceBusiness >= input.priceEconomy,
    { path: ['priceBusiness'], message: 'Бизнес не может быть дешевле эконома' },
  );
export type FlightScheduleInput = z.infer<typeof flightScheduleSchema>;

/** Ожидаемые ошибки при заведении и удалении рейсов. */
export type FlightScheduleError =
  | 'UNKNOWN_AIRLINE'
  | 'UNKNOWN_AIRPORT'
  | 'UNKNOWN_AIRCRAFT'
  | 'SAME_CITY'
  | 'DATE_IN_PAST'
  | 'NO_DATES'
  | 'ROUTE_NOT_FOUND'
  | 'HAS_TICKETS';

/** Маршрут в таблице админки: рейсы одной авиакомпании между двумя аэропортами. */
export type AdminRoute = {
  airlineCode: string;
  airlineName: string;
  originIata: string;
  originCity: string;
  destinationIata: string;
  destinationCity: string;
  flights: number;
  /** Первый и последний вылет. */
  first: Date;
  last: Date;
  /** Билетов на рейсах маршрута: пока они есть, маршрут не удалить. */
  tickets: number;
};

/** Цены в копейках: введённые администратором в рублях, недостающие — по расстоянию. */
export function schedulePrices(
  input: Pick<FlightScheduleInput, 'priceEconomy' | 'priceBusiness'>,
  km: number,
): { economy: number; business: number } {
  const base = basePrices(km);
  const economy = input.priceEconomy === undefined ? base.economy : input.priceEconomy * 100;
  const business =
    input.priceBusiness !== undefined
      ? input.priceBusiness * 100
      : input.priceEconomy !== undefined
        ? roundTo(input.priceEconomy * BUSINESS_FACTOR, 100) * 100
        : base.business;
  return { economy, business };
}

type NewFlight = typeof flights.$inferInsert;
type ScheduleAirport = { id: number; timezone: string };

/** Всё, что нужно для рейсов, кроме дат: найдено в справочниках и посчитано сервисом. */
export type SchedulePlan = {
  airlineId: number;
  aircraftModelId: number;
  origin: ScheduleAirport;
  destination: ScheduleAirport;
  /** Номер рейса туда и обратно: `NRD 100`, `NRD 101`. */
  number: string;
  returnNumber: string;
  durationMinutes: number;
  prices: { economy: number; business: number };
};

/** Даты периода, которые приходятся на выбранные дни недели. */
export function scheduleDates(
  input: Pick<FlightScheduleInput, 'dateFrom' | 'dateTo' | 'weekdays'>,
): string[] {
  const dates: string[] = [];
  for (let date = input.dateFrom; date <= input.dateTo; date = addDays(date, 1)) {
    if (input.weekdays.includes(weekday(date))) dates.push(date);
  }
  return dates;
}

/**
 * Рейсы по расписанию: вылет в местное время аэропорта вылета; обратный рейс — после
 * стоянки в аэропорту прилёта, с теми же ценами и самолётом.
 */
export function planFlights(
  input: Pick<
    FlightScheduleInput,
    'dateFrom' | 'dateTo' | 'weekdays' | 'departureTime' | 'withReturn'
  >,
  plan: SchedulePlan,
): NewFlight[] {
  const minutes = (count: number) => count * 60_000;
  return scheduleDates(input).flatMap((date) => {
    const departsAt = zonedTimeToUtc(date, input.departureTime, plan.origin.timezone);
    const arrivesAt = new Date(departsAt.getTime() + minutes(plan.durationMinutes));
    const common = {
      airlineId: plan.airlineId,
      aircraftModelId: plan.aircraftModelId,
      priceEconomy: plan.prices.economy,
      priceBusiness: plan.prices.business,
    };
    const there = {
      ...common,
      number: plan.number,
      originId: plan.origin.id,
      destinationId: plan.destination.id,
      departsAt,
      arrivesAt,
    };
    if (!input.withReturn) return [there];

    const returnDeparts = new Date(arrivesAt.getTime() + minutes(TURNAROUND_MINUTES));
    return [
      there,
      {
        ...common,
        number: plan.returnNumber,
        originId: plan.destination.id,
        destinationId: plan.origin.id,
        departsAt: returnDeparts,
        arrivesAt: new Date(returnDeparts.getTime() + minutes(plan.durationMinutes)),
      },
    ];
  });
}

/** Следующий свободный номер рейса авиакомпании: на единицу больше самого большого. */
export function nextFlightNumber(code: string, numbers: string[]): number {
  const used = numbers
    .map((number) => Number(number.slice(code.length + 1)))
    .filter((value) => Number.isInteger(value));
  return used.length > 0 ? Math.max(...used) + 1 : 100;
}

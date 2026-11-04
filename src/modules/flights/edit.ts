import { z } from 'zod';
import { fail, ok, type Result } from '@/shared/lib/result';
import { plural } from '@/shared/lib/format';
import { dateInZone, zonedTimeToUtc } from '@/shared/lib/time';
import { optionalInt, type ExistingFlight, type FlightDuplicates } from './schedule';

/*
 * Правка рейсов в админке (замечание преподавателя одногруппнику: «А как редактировать
 * записи?»): один рейс или все предстоящие рейсы маршрута. Здесь — проверка формы и расчёт
 * новых значений без базы; сервис добавляет данные из базы и проверку дублей.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRICE_MESSAGE = 'От 100 до 1 000 000 ₽';
const DURATION_MESSAGE = 'От 20 до 1200 минут';

/** Обязательное целое из поля формы. */
const requiredInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform(Number)
    .pipe(z.number(message).int(message).min(min, message).max(max, message));

const businessNotCheaper = <T extends { priceEconomy?: number; priceBusiness?: number }>(
  input: T,
) =>
  input.priceEconomy === undefined ||
  input.priceBusiness === undefined ||
  input.priceBusiness >= input.priceEconomy;
const BUSINESS_RULE = { path: ['priceBusiness'], message: 'Бизнес не может быть дешевле эконома' };

/** Форма одного рейса: все поля заполнены — в них текущие значения рейса. */
export const flightEditSchema = z
  .object({
    departureDate: z.iso.date('Укажите дату'),
    departureTime: z.string().regex(TIME, 'Укажите время вылета'),
    durationMinutes: requiredInt(20, 1200, DURATION_MESSAGE),
    aircraftModelId: z.coerce.number('Выберите самолёт').int().positive('Выберите самолёт'),
    priceEconomy: requiredInt(100, 1_000_000, PRICE_MESSAGE),
    priceBusiness: requiredInt(100, 1_000_000, PRICE_MESSAGE),
  })
  .refine(businessNotCheaper, BUSINESS_RULE);
export type FlightEditInput = z.infer<typeof flightEditSchema>;

/** Форма маршрута: пустое поле — «не менять»; заполнить надо хотя бы одно. */
export const routeEditSchema = z
  .object({
    aircraftModelId: z
      .string()
      .trim()
      .transform((value) => (value === '' ? undefined : Number(value)))
      .pipe(z.number().int().positive('Выберите самолёт').optional()),
    departureTime: z
      .string()
      .trim()
      .transform((value) => (value === '' ? undefined : value))
      .pipe(z.string().regex(TIME, 'Время — в формате ЧЧ:ММ').optional()),
    durationMinutes: optionalInt(20, 1200, DURATION_MESSAGE),
    priceEconomy: optionalInt(100, 1_000_000, PRICE_MESSAGE),
    priceBusiness: optionalInt(100, 1_000_000, PRICE_MESSAGE),
  })
  .refine(businessNotCheaper, BUSINESS_RULE)
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    path: ['aircraftModelId'],
    message: 'Заполните хотя бы одно поле — пустые не меняются',
  });
export type RouteEditInput = z.infer<typeof routeEditSchema>;

/** Рейс, который правят: из базы, с часовым поясом аэропорта вылета и занятыми местами. */
export type EditableFlight = ExistingFlight & {
  id: string;
  aircraftModelId: number;
  arrivesAt: Date;
  priceEconomy: number;
  priceBusiness: number;
  /** Часовой пояс аэропорта вылета: время в форме — местное. */
  originTimezone: string;
  /** Мест занято действующими билетами: пока они есть, самолёт не сменить. */
  heldSeats: number;
};

/** Рейс для страниц правки: с названиями авиакомпании, городов, аэропортов и самолёта. */
export type FlightEditView = EditableFlight & {
  airlineCode: string;
  airlineName: string;
  originIata: string;
  originCity: string;
  destinationIata: string;
  destinationCity: string;
  aircraft: string;
};

/** Новые значения рейса. */
export type FlightChange = Pick<
  EditableFlight,
  | 'id'
  | 'number'
  | 'airlineId'
  | 'originId'
  | 'destinationId'
  | 'aircraftModelId'
  | 'departsAt'
  | 'arrivesAt'
  | 'priceEconomy'
  | 'priceBusiness'
>;

export type FlightEditError =
  | 'NOT_FOUND'
  | 'DEPARTED'
  | 'NO_UPCOMING'
  | 'DATE_IN_PAST'
  | 'AIRCRAFT_HAS_TICKETS'
  | 'BUSINESS_CHEAPER'
  | 'UNKNOWN_AIRCRAFT'
  | 'DUPLICATE';

const MINUTE = 60_000;

/** Длительность рейса в минутах. */
export const durationOf = (flight: Pick<EditableFlight, 'departsAt' | 'arrivesAt'>) =>
  Math.round((flight.arrivesAt.getTime() - flight.departsAt.getTime()) / MINUTE);

const change = (
  flight: EditableFlight,
  values: Pick<FlightChange, 'aircraftModelId' | 'departsAt' | 'priceEconomy' | 'priceBusiness'> & {
    durationMinutes: number;
  },
): FlightChange => ({
  id: flight.id,
  number: flight.number,
  airlineId: flight.airlineId,
  originId: flight.originId,
  destinationId: flight.destinationId,
  aircraftModelId: values.aircraftModelId,
  departsAt: values.departsAt,
  arrivesAt: new Date(values.departsAt.getTime() + values.durationMinutes * MINUTE),
  priceEconomy: values.priceEconomy,
  priceBusiness: values.priceBusiness,
});

/**
 * Новые значения одного рейса. Улетевший рейс не меняется, новое время вылета — только
 * в будущем, самолёт на рейсе с проданными местами не меняется (в другом салоне их может
 * не оказаться). Цены в форме — рубли, в базе — копейки.
 */
export function planFlightEdit(
  flight: EditableFlight,
  input: FlightEditInput,
  now: Date,
): Result<FlightChange, FlightEditError> {
  if (flight.departsAt <= now) return fail('DEPARTED');
  const departsAt = zonedTimeToUtc(input.departureDate, input.departureTime, flight.originTimezone);
  if (departsAt <= now) return fail('DATE_IN_PAST');
  if (input.aircraftModelId !== flight.aircraftModelId && flight.heldSeats > 0) {
    return fail('AIRCRAFT_HAS_TICKETS');
  }
  return ok(
    change(flight, {
      aircraftModelId: input.aircraftModelId,
      departsAt,
      durationMinutes: input.durationMinutes,
      priceEconomy: input.priceEconomy * 100,
      priceBusiness: input.priceBusiness * 100,
    }),
  );
}

/**
 * Новые значения всех предстоящих рейсов маршрута: заполненные поля формы заменяют своё у
 * каждого рейса, остальное остаётся. Время вылета — то же местное время в тот же день.
 */
export function planRouteEdit(
  flights: EditableFlight[],
  input: RouteEditInput,
  now: Date,
): Result<FlightChange[], FlightEditError> {
  const upcoming = flights.filter((flight) => flight.departsAt > now);
  if (upcoming.length === 0) return fail('NO_UPCOMING');
  const newAircraft = input.aircraftModelId;
  if (
    newAircraft !== undefined &&
    upcoming.some((flight) => flight.aircraftModelId !== newAircraft && flight.heldSeats > 0)
  ) {
    return fail('AIRCRAFT_HAS_TICKETS');
  }

  const changes = upcoming.map((flight) =>
    change(flight, {
      aircraftModelId: newAircraft ?? flight.aircraftModelId,
      departsAt: input.departureTime
        ? zonedTimeToUtc(
            dateInZone(flight.departsAt, flight.originTimezone),
            input.departureTime,
            flight.originTimezone,
          )
        : flight.departsAt,
      durationMinutes: input.durationMinutes ?? durationOf(flight),
      priceEconomy:
        input.priceEconomy === undefined ? flight.priceEconomy : input.priceEconomy * 100,
      priceBusiness:
        input.priceBusiness === undefined ? flight.priceBusiness : input.priceBusiness * 100,
    }),
  );
  if (changes.some((flight) => flight.departsAt <= now)) return fail('DATE_IN_PAST');
  if (changes.some((flight) => flight.priceBusiness < flight.priceEconomy)) {
    return fail('BUSINESS_CHEAPER');
  }
  return ok(changes);
}

/**
 * Рейсы, которые после правки вылетают одновременно по одному маршруту одной авиакомпании,
 * — дубли (например, два рейса в день получили одно время). Первый по времени — для сообщения.
 */
export function findRepeatedFlight(changes: FlightChange[]): FlightChange | null {
  const seen = new Set<string>();
  const repeated = [...changes]
    .sort((a, b) => a.departsAt.getTime() - b.departsAt.getTime())
    .find((flight) => {
      const key = `${flight.airlineId}|${flight.originId}|${flight.destinationId}|${flight.departsAt.getTime()}`;
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
  return repeated ?? null;
}

/** Маршрут в адресе: авиакомпания и аэропорты вылета и прилёта. */
export type RouteRef = { airline: string; origin: string; destination: string };

export const routeRefSchema = z.object({
  airline: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().regex(/^[A-Z0-9]{2,4}$/),
  ),
  origin: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().regex(/^[A-Z]{3}$/),
  ),
  destination: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().regex(/^[A-Z]{3}$/),
  ),
});

/** Страница маршрута в админке: `/admin/flights/route?airline=STV&origin=SVO&destination=LED`. */
export function adminRouteHref(
  route: RouteRef,
  extra: Record<string, string | number> = {},
  path = '/admin/flights/route',
): string {
  const params = new URLSearchParams({ ...route });
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
  return `${path}?${params}`;
}

const moscowTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

/** Сообщение о дублях после правки: какой рейс уже вылетает в это время. */
export function editDuplicateMessage({ count, first }: Pick<FlightDuplicates, 'count' | 'first'>) {
  const [date, time] = moscowTime.format(first.departsAt).split(', ');
  const who =
    count === 1
      ? 'Рейс'
      : `${count} ${plural(count, ['рейс', 'рейса', 'рейсов'])} совпадут с уже заведёнными. Первый —`;
  return `${who} ${first.number} уже вылетает ${date} в ${time} по Москве по этому маршруту. Изменения не сохранены: выберите другое время вылета.`;
}

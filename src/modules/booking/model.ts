import { z } from 'zod';
import type { CabinClass } from '@/modules/catalog-data';
import { MAX_PASSENGERS } from '@/modules/flights';
import { isExpiryValid, normalizeCardNumber, passesLuhn } from './card';
import type { orders, tickets } from './schema';

export type Order = typeof orders.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type OrderStatus = Order['status'];

/** Сколько неоплаченный заказ держит места (docs/02-product.md, «Заказы»). */
export const ORDER_HOLD_MINUTES = 15;

const seat = z.string().regex(/^\d{1,2}[A-HJK]$/, 'Неверный номер места');

/** Параметр, который может повторяться в адресе или форме, — всегда массив. */
const repeated = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
    z.array(item),
  );

/** Выбор со схемы салона: `/booking?flight=…&cabinClass=economy&seats=7D&seats=7E`. */
export const bookingRequestSchema = z.object({
  flight: z.uuid(),
  cabinClass: z.enum(['economy', 'business']),
  seats: repeated(seat)
    .pipe(z.array(seat).min(1).max(MAX_PASSENGERS))
    .refine((list) => new Set(list).size === list.length, 'Места повторяются'),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/** Имя и фамилия латиницей или кириллицей; дефис, пробел и апостроф — для двойных имён. */
const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Введите ${label}`)
    .max(50, `${label[0]?.toUpperCase()}${label.slice(1)} — до 50 символов`)
    .regex(/^\p{L}[\p{L} '’-]*$/u, 'Только буквы, пробел и дефис');

export const passengerSchema = z.object({
  firstName: personName('имя'),
  lastName: personName('фамилию'),
});
export type Passenger = z.infer<typeof passengerSchema>;

/** Заказ: выбор мест и по пассажиру на каждое место, в том же порядке. */
export const createOrderSchema = bookingRequestSchema
  .extend({ passengers: z.array(passengerSchema) })
  .refine((order) => order.passengers.length === order.seats.length, {
    message: 'На каждое место — один пассажир',
    path: ['passengers'],
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Демо-карта. Срок проверяется относительно `now`, поэтому схема создаётся под момент оплаты. */
export function cardSchema(now: Date) {
  return z.object({
    number: z
      .string()
      .transform(normalizeCardNumber)
      .pipe(
        z
          .string()
          .regex(/^\d{16}$/, 'Номер карты — 16 цифр')
          .refine(passesLuhn, 'Номер карты набран с ошибкой'),
      ),
    expiry: z
      .string()
      .refine((value) => isExpiryValid(value, now), 'Срок — ММ/ГГ, ещё не истёкший'),
    cvc: z.string().regex(/^\d{3}$/, 'CVC — 3 цифры'),
  });
}

/** Место в брони с ценой. */
export type PricedSeat = { seat: string; price: number; extraLegroom: boolean };

export type BookingError =
  | 'INVALID_REQUEST'
  | 'FLIGHT_NOT_FOUND'
  | 'FLIGHT_DEPARTED'
  /** Место не существует, другого класса или уже занято. */
  | 'SEAT_UNAVAILABLE';

export type OrderError = 'ORDER_NOT_FOUND' | 'ORDER_EXPIRED' | 'ORDER_NOT_PENDING';

/** Заказ для страниц брони и кабинета: билеты и рейс. */
export type OrderDetails = Pick<
  Order,
  'id' | 'pnr' | 'status' | 'total' | 'expiresAt' | 'paidAt' | 'cancelledAt' | 'createdAt'
> & {
  cabinClass: CabinClass;
  tickets: Array<Pick<Ticket, 'seat' | 'passengerFirstName' | 'passengerLastName' | 'price'>>;
  flight: {
    id: string;
    number: string;
    airlineName: string;
    departsAt: Date;
    arrivesAt: Date;
    origin: { city: string; iata: string; timezone: string };
    destination: { city: string; iata: string; timezone: string };
  };
};

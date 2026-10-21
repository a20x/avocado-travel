import type { CabinClass } from '@/modules/catalog-data';
import type { SeatMapRow } from '@/modules/flights';
import { fail, ok, type Result } from '@/shared/lib/result';
import type { PricedSeat } from './model';

/**
 * Цены выбранных мест по схеме салона рейса. Цена берётся только отсюда, с сервера:
 * то, что прислал браузер, — лишь номера мест.
 * Ошибка, если место не существует, другого класса или уже занято.
 */
export function priceSeats(
  seatMap: SeatMapRow[],
  cabinClass: CabinClass,
  seats: string[],
): Result<PricedSeat[], 'SEAT_UNAVAILABLE'> {
  const index = new Map(
    seatMap.flatMap((row) => row.groups.flat().map((seat) => [seat.id, { ...seat, row }] as const)),
  );
  const priced: PricedSeat[] = [];
  for (const id of seats) {
    const seat = index.get(id);
    if (!seat || seat.taken || seat.row.cabinClass !== cabinClass) return fail('SEAT_UNAVAILABLE');
    priced.push({ seat: id, price: seat.price, extraLegroom: seat.row.extraLegroom });
  }
  return ok(priced);
}

export function totalOf(seats: Array<{ price: number }>): number {
  return seats.reduce((sum, seat) => sum + seat.price, 0);
}

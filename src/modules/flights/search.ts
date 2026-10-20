import { seatCapacity } from '@/modules/catalog-data';
import { daysBetween } from '@/shared/lib/time';
import { SEARCH_DAYS_AHEAD, type FlightOffer, type SearchQuery, type SortOption } from './model';

/**
 * Чистые правила поиска — без базы и HTTP, поэтому легко проверяются тестами.
 * Сервис достаёт из базы кандидатов и прогоняет их через эти функции.
 */

/** Строка из базы: рейс вместе со справочниками. */
export type FlightRow = Omit<
  FlightOffer,
  'durationMinutes' | 'cabinClass' | 'price' | 'seatsLeft'
> & {
  priceEconomy: number;
  priceBusiness: number;
  layout: {
    businessRows: number;
    businessLayout: string;
    economyRows: number;
    economyLayout: string;
  };
};

/** Можно ли искать на эту дату: от сегодня (по времени города вылета) до 60 дней вперёд. */
export function isSearchDateAllowed(todayInOrigin: string, date: string): boolean {
  const days = daysBetween(todayInOrigin, date);
  return days >= 0 && days <= SEARCH_DAYS_AHEAD;
}

const BY: Record<SortOption, (a: FlightOffer, b: FlightOffer) => number> = {
  price: (a, b) => a.price - b.price,
  departure: (a, b) => a.departsAt.getTime() - b.departsAt.getTime(),
  duration: (a, b) => a.durationMinutes - b.durationMinutes,
};

/** Сортировка; при равенстве — по времени вылета, чтобы порядок всегда был одинаковым. */
export function sortOffers(offers: FlightOffer[], sort: SortOption): FlightOffer[] {
  return [...offers].sort((a, b) => BY[sort](a, b) || BY.departure(a, b));
}

/**
 * Превращает строки из базы в предложения: цена и места в выбранном классе,
 * фильтр по авиакомпаниям, только рейсы, где мест хватает на всех пассажиров.
 * `takenSeats` — сколько мест уже продано в этом классе по id рейса (появится с бронированием, T-13).
 */
export function toOffers(
  rows: FlightRow[],
  query: Pick<SearchQuery, 'cabinClass' | 'passengers' | 'airlines' | 'sort'>,
  takenSeats: ReadonlyMap<string, number> = new Map(),
): FlightOffer[] {
  const offers = rows
    .filter((row) => query.airlines.length === 0 || query.airlines.includes(row.airline.code))
    .map((row): FlightOffer => {
      const { priceEconomy, priceBusiness, layout, ...flight } = row;
      const capacity = seatCapacity(layout)[query.cabinClass];
      return {
        ...flight,
        durationMinutes: Math.round((row.arrivesAt.getTime() - row.departsAt.getTime()) / 60_000),
        cabinClass: query.cabinClass,
        price: query.cabinClass === 'business' ? priceBusiness : priceEconomy,
        seatsLeft: capacity - (takenSeats.get(row.id) ?? 0),
      };
    })
    .filter((offer) => offer.seatsLeft >= query.passengers);

  return sortOffers(offers, query.sort);
}

import { z } from 'zod';
import type { CabinClass } from '@/modules/catalog-data';
import type { DaySpan } from '@/shared/lib/available-days';
import type { SeatMapRow } from './seat-map';
import type { flights } from './schema';

export type Flight = typeof flights.$inferSelect;

/** Правила поиска (docs/02-product.md, «Поиск рейсов»). */
export const MAX_PASSENGERS = 6;
export const SEARCH_DAYS_AHEAD = 60;

export const SORT_OPTIONS = ['price', 'departure', 'duration'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Время вылета по местному времени города вылета: утро 06–12, день 12–18, вечер 18–24. */
export const DEPARTURE_PERIODS = ['morning', 'day', 'evening'] as const;
export type DeparturePeriod = (typeof DEPARTURE_PERIODS)[number];

const citySlug = z.string().regex(/^[a-z]+(-[a-z]+)*$/, 'Неверный город');

/** Параметр адреса, который может повторяться (`?airlines=LST&airlines=KRR`), — всегда массив. */
const repeated = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
    z.array(item),
  );

/**
 * Запрос поиска — параметры адреса страницы результатов. Проверяется на сервере,
 * даже если форма уже проверила его в браузере. Необязательные параметры получают значения
 * по умолчанию, чтобы короткая ссылка `/flights?from=…&to=…&date=…` тоже работала.
 */
export const searchQuerySchema = z.object({
  from: citySlug,
  to: citySlug,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД'),
  passengers: z.coerce.number().int().min(1).max(MAX_PASSENGERS).default(1),
  cabinClass: z.enum(['economy', 'business']).default('economy'),
  sort: z.enum(SORT_OPTIONS).default('price'),
  /** Фильтры. Коды авиакомпаний; пусто — все. */
  airlines: repeated(z.string().regex(/^[A-Z]{3}$/)),
  /** Время вылета; пусто — любое. */
  times: repeated(z.enum(DEPARTURE_PERIODS)),
  /** Только рейсы с багажом в цене. Флажок формы присылает «on». */
  baggage: z.stringbool().default(false),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export type SearchError = 'INVALID_QUERY' | 'SAME_CITY' | 'UNKNOWN_CITY' | 'DATE_OUT_OF_RANGE';

type PlaceInfo = { iata: string; name: string; city: string; citySlug: string; timezone: string };

/** Рейс в результатах поиска — всё, что нужно показать в карточке. */
export type FlightOffer = {
  id: string;
  number: string;
  airline: { code: string; name: string; logo: string; color: string; baggageIncluded: boolean };
  aircraft: { manufacturer: string; model: string };
  origin: PlaceInfo;
  destination: PlaceInfo;
  departsAt: Date;
  arrivesAt: Date;
  durationMinutes: number;
  cabinClass: CabinClass;
  /** Цена за одного пассажира в выбранном классе, копейки. */
  price: number;
  seatsLeft: number;
};

/** Авиакомпания среди найденных рейсов — для фильтра, с самой низкой ценой. */
export type AirlineFacet = {
  code: string;
  name: string;
  logo: string;
  minPrice: number;
};

/** Ответ поиска: рейсы после фильтров и все авиакомпании маршрута на эту дату. */
export type SearchResult = {
  query: SearchQuery;
  offers: FlightOffer[];
  airlines: AirlineFacet[];
};

/**
 * Направление «откуда — куда» с рейсами в окне продажи: первый и последний день и дни недели
 * по местному времени вылета. По ним поиск-фраза сужает «Куда» и ограничивает календарь.
 */
export type SearchRoute = { from: string; to: string } & DaySpan;

/** Рейс на своей странице: цены обоих классов, свободные места и схема салона. */
export type FlightDetails = Omit<FlightOffer, 'cabinClass' | 'price' | 'seatsLeft'> & {
  prices: Record<CabinClass, number>;
  seatsLeft: Record<CabinClass, number>;
  seatMap: SeatMapRow[];
  /** Вылет уже был — места не выбираются. */
  isDeparted: boolean;
};

export type FlightError = 'NOT_FOUND';

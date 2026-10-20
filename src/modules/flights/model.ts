import { z } from 'zod';
import type { CabinClass } from '@/modules/catalog-data';
import type { flights } from './schema';

export type Flight = typeof flights.$inferSelect;

/** Правила поиска (docs/02-product.md, «Поиск рейсов»). */
export const MAX_PASSENGERS = 6;
export const SEARCH_DAYS_AHEAD = 60;

export const SORT_OPTIONS = ['price', 'departure', 'duration'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

const citySlug = z.string().regex(/^[a-z]+(-[a-z]+)*$/, 'Неверный город');

/** Запрос поиска. Проверяется на сервере, даже если форма уже проверила его в браузере. */
export const searchQuerySchema = z.object({
  from: citySlug,
  to: citySlug,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД'),
  passengers: z.coerce.number().int().min(1).max(MAX_PASSENGERS),
  cabinClass: z.enum(['economy', 'business']),
  sort: z.enum(SORT_OPTIONS).default('price'),
  /** Коды авиакомпаний для фильтра; пусто — все. */
  airlines: z.array(z.string().regex(/^[A-Z]{3}$/)).default([]),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export type SearchError = 'INVALID_QUERY' | 'SAME_CITY' | 'UNKNOWN_CITY' | 'DATE_OUT_OF_RANGE';

type PlaceInfo = { iata: string; name: string; city: string; timezone: string };

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

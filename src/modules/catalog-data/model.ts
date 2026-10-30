import { z } from 'zod';
import { slugify } from '@/shared/lib/slug';
import type { aircraftModels, airlines, airports, cities } from './schema';

// Типы выводятся из таблиц Drizzle, а не пишутся руками второй раз (docs/03-architecture.md).
export type CityRecord = typeof cities.$inferSelect;
export type AirportRecord = typeof airports.$inferSelect;
/** Аэропорт вместе с названием своего города и страной — так его видят страницы и API. */
export type Airport = AirportRecord & { city: string; country: string };
export type Airline = typeof airlines.$inferSelect;
export type AircraftModel = typeof aircraftModels.$inferSelect;

/** Ожидаемые ошибки правки справочников. */
export type CatalogDataError =
  'NOT_FOUND' | 'CITY_EXISTS' | 'IATA_TAKEN' | 'CODE_TAKEN' | 'NAME_TAKEN' | 'HAS_FLIGHTS';

/** Строка таблицы городов в админке. */
export type CityAdminRow = Pick<CityRecord, 'slug' | 'name' | 'country'> & {
  airports: string[];
  flights: number;
};

/** Строка таблицы авиакомпаний в админке. */
export type AirlineAdminRow = Pick<Airline, 'code' | 'name' | 'color' | 'logo'> & {
  flights: number;
};

/** Логотип авиакомпании, заведённой в админке: свой рисунок загрузить нельзя. */
export const DEFAULT_AIRLINE_LOGO = '/images/airlines/default.svg';

/** Существует ли такой часовой пояс IANA: `Europe/Moscow`, `Asia/Vladivostok`. */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value.includes('/');
  } catch {
    return false;
  }
}

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} — от ${min} символов`)
    .max(max, `${label} — до ${max} символов`);

/** Трёхбуквенный код латиницей: код аэропорта (`SVO`) или внутренний код авиакомпании. */
const code = (message: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, message);

/** Координата из поля формы: допускается и запятая, «55,97». */
const coordinate = (label: string, limit: number) =>
  z
    .string()
    .trim()
    .min(1, `Укажите ${label}`)
    .transform((value) => Number(value.replace(',', '.')))
    .pipe(
      z
        .number(`${label[0]?.toUpperCase()}${label.slice(1)} — число`)
        .min(-limit, `От −${limit} до ${limit}`)
        .max(limit, `От −${limit} до ${limit}`),
    );

/** Форма города: то, что можно поменять и после создания. */
export const cityInputSchema = z.object({
  name: text('Название', 2, 50).refine(
    (value) => slugify(value) !== '',
    'Название должно содержать буквы',
  ),
  nameFrom: text('Форма «из …»', 2, 60),
  nameTo: text('Форма «в …»', 2, 60),
  country: text('Страна', 2, 50),
  description: z.string().trim().max(1000, 'Описание — до 1000 символов'),
});
export type CityInput = z.infer<typeof cityInputSchema>;

/** Новый город заводится сразу с аэропортом: без аэропорта в город нельзя завести рейсы. */
export const newCitySchema = cityInputSchema.extend({
  iata: code('Код аэропорта — три латинские буквы, например MMK'),
  airportName: text('Название аэропорта', 2, 60),
  lat: coordinate('широту', 90),
  lon: coordinate('долготу', 180),
  timezone: z.string().refine(isTimeZone, 'Выберите часовой пояс'),
});
export type NewCityInput = z.infer<typeof newCitySchema>;

/** Форма авиакомпании: то, что можно поменять и после создания. */
export const airlineInputSchema = z.object({
  name: text('Название', 2, 40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет — в формате #1F6F6A'),
  description: text('Описание', 10, 300),
  // Флажок формы: отмеченный присылает «on», снятый не присылает ничего.
  baggageIncluded: z.string().transform((value) => value === 'on'),
});
export type AirlineInput = z.infer<typeof airlineInputSchema>;

/** Код авиакомпании задаётся один раз: он входит в номера её рейсов. */
export const newAirlineSchema = airlineInputSchema.extend({
  code: code('Код — три латинские буквы, например NRD'),
});
export type NewAirlineInput = z.infer<typeof newAirlineSchema>;

/** Часовые пояса IANA для списка формы, по алфавиту. */
export function listTimeZones(): string[] {
  return Intl.supportedValuesOf('timeZone')
    .filter((zone) => zone.includes('/'))
    .sort();
}

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
  | 'NOT_FOUND'
  | 'CITY_EXISTS'
  | 'IATA_TAKEN'
  | 'CODE_TAKEN'
  | 'NAME_TAKEN'
  | 'HAS_FLIGHTS'
  | 'HAS_AIRLINES'
  | 'UNKNOWN_COUNTRY'
  | 'UNKNOWN_WORLD_PART'
  | 'UNKNOWN_TIMEZONE'
  | 'UNKNOWN_CARRIER_TYPE'
  | 'UNKNOWN_BASE_CITY';

/** Какие выпадающие списки форм хранятся в таблице `reference_values` (ADR-0013). */
export const REFERENCE_KINDS = ['country', 'world_part', 'timezone', 'airline_type'] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];
/** Значения всех списков: каждое один раз, по алфавиту. */
export type ReferenceLists = Record<ReferenceKind, string[]>;

/** Строка таблицы городов в админке. */
export type CityAdminRow = Pick<CityRecord, 'slug' | 'name' | 'country' | 'worldPart'> & {
  airports: string[];
  flights: number;
};

/** Строка таблицы авиакомпаний в админке. */
export type AirlineAdminRow = Pick<
  Airline,
  'code' | 'name' | 'color' | 'logo' | 'country' | 'carrierType'
> & {
  baseCity: string;
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

/** Самое короткое написание пояса: `asia/tokyo` → `Asia/Tokyo`. */
function canonicalTimeZone(value: string): string {
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
  return zone.includes('/') ? zone : value;
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

/** Значение, выбранное в выпадающем списке: пустое — ничего не выбрано. */
const choice = (message: string) => z.string().trim().min(1, message).max(80, message);

/** Новое значение списка из формы кнопки «Добавить». Часовой пояс должен существовать на самом деле. */
export const newReferenceValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('timezone'),
    value: z
      .string()
      .trim()
      .refine(isTimeZone, 'Такого часового пояса нет. Формат: Asia/Tokyo')
      .transform(canonicalTimeZone),
  }),
  z.object({
    kind: z.enum(['country', 'world_part', 'airline_type']),
    value: text('Значение', 2, 50).refine(
      (value) => /\p{L}/u.test(value),
      'Значение должно содержать буквы',
    ),
  }),
]);
export type NewReferenceValue = z.infer<typeof newReferenceValueSchema>;

/** Форма города: то, что можно поменять и после создания. */
export const cityInputSchema = z.object({
  name: text('Название', 2, 50).refine(
    (value) => slugify(value) !== '',
    'Название должно содержать буквы',
  ),
  nameFrom: text('Форма «из …»', 2, 60),
  nameTo: text('Форма «в …»', 2, 60),
  country: choice('Выберите страну'),
  worldPart: choice('Выберите часть света'),
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
  country: choice('Выберите страну'),
  carrierType: choice('Выберите тип авиакомпании'),
  baseCitySlug: choice('Выберите базовый город'),
});
export type AirlineInput = z.infer<typeof airlineInputSchema>;

/** Код авиакомпании задаётся один раз: он входит в номера её рейсов. */
export const newAirlineSchema = airlineInputSchema.extend({
  code: code('Код — три латинские буквы, например NRD'),
});
export type NewAirlineInput = z.infer<typeof newAirlineSchema>;

/**
 * Варианты списка: из базы и только что добавленные кнопкой «+ Добавить» — без повторов, по алфавиту.
 * Одно и то же значение могут добавить дважды подряд, пока страница не получила свежий список.
 */
export function mergeOptions<O extends { value: string; label: string }>(
  options: O[],
  added: O[],
): O[] {
  return [...new Map([...options, ...added].map((option) => [option.value, option])).values()].sort(
    (a, b) => a.label.localeCompare(b.label, 'ru'),
  );
}

/**
 * Куда вернуться после нового города или авиакомпании, если форму открыли кнопкой «Добавить»
 * у списка в форме рейсов: обратно в неё, и новое значение уже выбрано в своём списке.
 * Только эти три адреса — чужой адрес из формы не примется (нет открытой переадресации).
 */
export const REFERENCE_RETURNS = [
  'flights-airline',
  'flights-origin',
  'flights-destination',
] as const;
export type ReferenceReturn = (typeof REFERENCE_RETURNS)[number];

/** Значение из формы или адреса → цель возврата; непонятное — без возврата. */
export const referenceReturnSchema = z
  .preprocess((value) => (Array.isArray(value) ? value[0] : value), z.enum(REFERENCE_RETURNS))
  .optional()
  .catch(undefined);

/** Адрес формы рейсов с новым значением в нужном списке: `/admin/flights/new?origin=MMK`. */
export function referenceReturnHref(target: ReferenceReturn, value: string): string {
  const field = target.slice('flights-'.length);
  return `/admin/flights/new?${new URLSearchParams({ [field]: value })}`;
}

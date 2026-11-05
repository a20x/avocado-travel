import 'server-only';
import { indexDocument, removeDocument } from '@/modules/search/server';
import { fail, ok, type Result } from '@/shared/lib/result';
import { slugify } from '@/shared/lib/slug';
import { citySearchDocument, groupCities, type City } from '../cities';
import {
  DEFAULT_AIRLINE_LOGO,
  type AircraftModel,
  type Airline,
  type AirlineAdminRow,
  type AirlineInput,
  type Airport,
  type CatalogDataError,
  type CityAdminRow,
  type CityInput,
  type NewAirlineInput,
  type NewCityInput,
  type NewReferenceValue,
  type ReferenceLists,
} from '../model';
import * as repository from './repository';

/**
 * Сортировка списков — по правилам русского алфавита, а не базы: порядок строк в PostgreSQL
 * зависит от настроек сервера, а выпадающие списки должны идти по алфавиту везде.
 */
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ru');

export function listAirports(): Promise<Airport[]> {
  return repository.findAllAirports();
}

export function listAirportsInCity(citySlug: string): Promise<Airport[]> {
  return repository.findAirportsByCitySlug(citySlug);
}

/** Города, куда летаем, по алфавиту. */
export async function listCities(): Promise<City[]> {
  const [cities, airports] = await Promise.all([
    repository.findAllCities(),
    repository.findAllAirports(),
  ]);
  return groupCities(cities.sort(byName), airports);
}

/** Город по адресу страницы или null, если такого нет. */
export async function getCity(citySlug: string): Promise<City | null> {
  const [city, airports] = await Promise.all([
    repository.findCityBySlug(citySlug),
    repository.findAirportsByCitySlug(citySlug),
  ]);
  return city ? (groupCities([city], airports)[0] ?? null) : null;
}

/** Авиакомпании по алфавиту. */
export async function listAirlines(): Promise<Airline[]> {
  return (await repository.findAllAirlines()).sort(byName);
}

export function listAircraftModels(): Promise<AircraftModel[]> {
  return repository.findAllAircraftModels();
}

/** Значения выпадающих списков форм: каждое один раз, по алфавиту. */
export async function getReferenceLists(): Promise<ReferenceLists> {
  const lists: ReferenceLists = { country: [], world_part: [], timezone: [], airline_type: [] };
  for (const { kind, value } of await repository.findReferenceValues()) {
    if (kind in lists) lists[kind as keyof ReferenceLists].push(value);
  }
  for (const list of Object.values(lists)) list.sort((a, b) => a.localeCompare(b, 'ru'));
  return lists;
}

/**
 * Новое значение списка. Такое уже есть, даже написанное иначе, — возвращается оно:
 * дублей в списке не бывает, а форма просто выберет нужное значение.
 */
export async function addReferenceValue({ kind, value }: NewReferenceValue): Promise<string> {
  const existing = await repository.findReferenceValue(kind, value);
  if (existing) return existing;
  await repository.insertReferenceValue(kind, value);
  return value;
}

/*
 * Правка справочников в админке. Права проверяет action, ввод — схемы Zod из model.ts.
 * Город и авиакомпанию с рейсами удалить нельзя: на рейсы ссылаются билеты и отчёты.
 */

/** Города для таблицы админки: аэропорты и число рейсов. */
export async function listCitiesForAdmin(): Promise<CityAdminRow[]> {
  const [cities, flights] = await Promise.all([listCities(), repository.countFlightsByCity()]);
  return cities.map((city) => ({
    slug: city.slug,
    name: city.name,
    country: city.country,
    worldPart: city.worldPart,
    airports: city.airports.map((airport) => airport.iata),
    flights: flights.get(city.slug) ?? 0,
  }));
}

/** Город для формы правки или null. */
export async function getCityForEdit(slug: string): Promise<(CityInput & { slug: string }) | null> {
  const city = await repository.findCityBySlug(slug);
  if (!city) return null;
  const { name, nameFrom, nameTo, country, worldPart, description } = city;
  return { slug, name, nameFrom, nameTo, country, worldPart, description };
}

/** Значения из списков формы города есть в справочнике: запрос можно отправить и в обход формы. */
async function checkCityLists(input: {
  country: string;
  worldPart: string;
  timezone?: string;
}): Promise<CatalogDataError | null> {
  if (!(await repository.referenceValueExists('country', input.country))) return 'UNKNOWN_COUNTRY';
  if (!(await repository.referenceValueExists('world_part', input.worldPart))) {
    return 'UNKNOWN_WORLD_PART';
  }
  if (input.timezone && !(await repository.referenceValueExists('timezone', input.timezone))) {
    return 'UNKNOWN_TIMEZONE';
  }
  return null;
}

/** То же для формы авиакомпании. */
async function checkAirlineLists(input: AirlineInput): Promise<CatalogDataError | null> {
  if (!(await repository.referenceValueExists('country', input.country))) return 'UNKNOWN_COUNTRY';
  if (!(await repository.referenceValueExists('airline_type', input.carrierType))) {
    return 'UNKNOWN_CARRIER_TYPE';
  }
  if (!(await repository.findCityBySlug(input.baseCitySlug))) return 'UNKNOWN_BASE_CITY';
  return null;
}

async function reindexCity(slug: string): Promise<void> {
  const city = await getCity(slug);
  if (city) await indexDocument(citySearchDocument(city));
}

export async function createCity(
  input: NewCityInput,
): Promise<Result<{ slug: string }, CatalogDataError>> {
  const slug = slugify(input.name);
  if ((await repository.findCityBySlug(slug)) || (await repository.findCityByName(input.name))) {
    return fail('CITY_EXISTS');
  }
  if (await repository.findAirportByIata(input.iata)) return fail('IATA_TAKEN');
  const unknown = await checkCityLists(input);
  if (unknown) return fail(unknown);

  const { iata, airportName, lat, lon, timezone, ...city } = input;
  await repository.insertCity({ slug, ...city }, { iata, name: airportName, lat, lon, timezone });
  await reindexCity(slug);
  return ok({ slug });
}

export async function updateCity(
  slug: string,
  input: CityInput,
): Promise<Result<{ slug: string }, CatalogDataError>> {
  const sameName = await repository.findCityByName(input.name);
  if (sameName && sameName.slug !== slug) return fail('CITY_EXISTS');
  const unknown = await checkCityLists(input);
  if (unknown) return fail(unknown);
  if (!(await repository.updateCity(slug, input))) return fail('NOT_FOUND');
  await reindexCity(slug);
  return ok({ slug });
}

export async function deleteCity(slug: string): Promise<Result<null, CatalogDataError>> {
  if ((await repository.countFlightsOfCity(slug)) > 0) return fail('HAS_FLIGHTS');
  if ((await repository.countAirlinesBasedIn(slug)) > 0) return fail('HAS_AIRLINES');
  if (!(await repository.deleteCity(slug))) return fail('NOT_FOUND');
  await removeDocument('page', `city:${slug}`);
  return ok(null);
}

/** Авиакомпании для таблицы админки: число рейсов. */
export async function listAirlinesForAdmin(): Promise<AirlineAdminRow[]> {
  const [airlines, flights, cities] = await Promise.all([
    listAirlines(),
    repository.countFlightsByAirline(),
    repository.findAllCities(),
  ]);
  const cityName = new Map(cities.map((city) => [city.slug, city.name]));
  return airlines.map(({ code, name, color, logo, country, carrierType, baseCitySlug }) => ({
    code,
    name,
    color,
    logo,
    country,
    carrierType,
    baseCity: cityName.get(baseCitySlug) ?? baseCitySlug,
    flights: flights.get(code) ?? 0,
  }));
}

/** Авиакомпания для формы правки или null. */
export async function getAirlineForEdit(
  code: string,
): Promise<(AirlineInput & { code: string }) | null> {
  const airline = await repository.findAirlineByCode(code);
  if (!airline) return null;
  const { name, color, description, baggageIncluded, country, carrierType, baseCitySlug } = airline;
  return { code, name, color, description, baggageIncluded, country, carrierType, baseCitySlug };
}

export async function createAirline(
  input: NewAirlineInput,
): Promise<Result<{ code: string }, CatalogDataError>> {
  if (await repository.findAirlineByCode(input.code)) return fail('CODE_TAKEN');
  if (await repository.findAirlineByName(input.name)) return fail('NAME_TAKEN');
  const unknown = await checkAirlineLists(input);
  if (unknown) return fail(unknown);
  await repository.insertAirline({ ...input, logo: DEFAULT_AIRLINE_LOGO });
  return ok({ code: input.code });
}

export async function updateAirline(
  code: string,
  input: AirlineInput,
): Promise<Result<{ code: string }, CatalogDataError>> {
  const sameName = await repository.findAirlineByName(input.name);
  if (sameName && sameName.code !== code) return fail('NAME_TAKEN');
  const unknown = await checkAirlineLists(input);
  if (unknown) return fail(unknown);
  if (!(await repository.updateAirline(code, input))) return fail('NOT_FOUND');
  return ok({ code });
}

export async function deleteAirline(code: string): Promise<Result<null, CatalogDataError>> {
  const flights = await repository.countFlightsByAirline();
  if ((flights.get(code) ?? 0) > 0) return fail('HAS_FLIGHTS');
  if (!(await repository.deleteAirline(code))) return fail('NOT_FOUND');
  return ok(null);
}

import type { AircraftModel, Airline, AirportRecord as Airport } from '@/modules/catalog-data';
import { basePrices, distanceKm, flightMinutes, flights, weekday } from '@/modules/flights';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import type { Db } from './db';
import { createRandom, departureTimes } from './schedule';

type NewFlight = typeof flights.$inferInsert;

/** Расписание: 180 дней назад (история для аналитики) и 60 дней вперёд (продажа). */
const DAYS_BACK = 180;
const DAYS_AHEAD = 60;

/**
 * Сеть маршрутов: [город, город, рейсов в день, дни недели (1 — пн … 7 — вс; нет — каждый день)].
 * Каждый маршрут летает в обе стороны.
 */
// prettier-ignore
const ROUTES: Array<[string, string, number, number[]?]> = [
  // Москва — со всеми городами
  ['moscow', 'saint-petersburg', 6], ['moscow', 'kaliningrad', 4], ['moscow', 'sochi', 5],
  ['moscow', 'kazan', 3], ['moscow', 'vladivostok', 2], ['moscow', 'yekaterinburg', 4],
  ['moscow', 'novosibirsk', 3], ['moscow', 'samara', 2], ['moscow', 'ufa', 2],
  ['moscow', 'krasnoyarsk', 2], ['moscow', 'irkutsk', 1], ['moscow', 'mineralnye-vody', 3],
  ['moscow', 'istanbul', 2], ['moscow', 'dubai', 2], ['moscow', 'yerevan', 2],
  ['moscow', 'tashkent', 2], ['moscow', 'beijing', 1],
  // Санкт-Петербург — с крупными городами
  ['saint-petersburg', 'kaliningrad', 2], ['saint-petersburg', 'sochi', 2],
  ['saint-petersburg', 'kazan', 1], ['saint-petersburg', 'yekaterinburg', 1],
  ['saint-petersburg', 'novosibirsk', 1], ['saint-petersburg', 'mineralnye-vody', 1, [1, 3, 5, 7]],
  ['saint-petersburg', 'istanbul', 1], ['saint-petersburg', 'dubai', 1, [2, 4, 6]],
  ['saint-petersburg', 'yerevan', 1, [1, 4, 6]], ['saint-petersburg', 'tashkent', 1, [2, 5]],
  // Региональные
  ['yekaterinburg', 'novosibirsk', 1], ['yekaterinburg', 'sochi', 1], ['kazan', 'sochi', 1],
  ['samara', 'sochi', 1, [1, 3, 5]], ['ufa', 'sochi', 1, [2, 4, 6]],
  ['novosibirsk', 'krasnoyarsk', 1, [1, 3, 5]], ['krasnoyarsk', 'irkutsk', 1, [2, 4, 6]],
  ['irkutsk', 'vladivostok', 1], ['novosibirsk', 'beijing', 1, [1, 4]],
  ['kazan', 'istanbul', 1, [3, 7]], ['yekaterinburg', 'dubai', 1, [2, 6]],
  ['novosibirsk', 'tashkent', 1, [1, 5]],
];

/** Дальность моделей самолётов, км. */
const RANGE_KM: Record<string, number> = {
  'Superjet 100': 3000,
  '737-800': 5000,
  A320neo: 6000,
  A321neo: 6600,
  '777-300ER': 13000,
};

type AirlineProfile = {
  models: string[];
  minKm: number;
  maxKm: number;
  /** Множитель цены: лоукостер дешевле, дальнемагистральный перевозчик дороже. */
  priceFactor: number;
  /** С какого номера начинаются рейсы. */
  firstNumber: number;
  /** Из какого аэропорта Москвы летает. */
  moscowAirport: string;
};

// prettier-ignore
const PROFILES: Record<string, AirlineProfile> = {
  LST: { models: ['A320neo', 'A321neo'], minKm: 0, maxKm: 6600, priceFactor: 1, firstNumber: 1000, moscowAirport: 'SVO' },
  ORN: { models: ['A320neo', '737-800'], minKm: 0, maxKm: 5000, priceFactor: 0.88, firstNumber: 2000, moscowAirport: 'DME' },
  ARL: { models: ['Superjet 100', 'A320neo'], minKm: 0, maxKm: 2800, priceFactor: 0.95, firstNumber: 3000, moscowAirport: 'DME' },
  STV: { models: ['Superjet 100', '737-800'], minKm: 0, maxKm: 2500, priceFactor: 0.92, firstNumber: 4000, moscowAirport: 'VKO' },
  KRR: { models: ['737-800'], minKm: 0, maxKm: 4500, priceFactor: 1.05, firstNumber: 5000, moscowAirport: 'VKO' },
  ALT: { models: ['777-300ER', 'A321neo'], minKm: 2000, maxKm: 13000, priceFactor: 1.12, firstNumber: 6000, moscowAirport: 'SVO' },
};

type Catalog = { airports: Airport[]; airlines: Airline[]; aircraftModels: AircraftModel[] };

/** Самолёт для маршрута: на дальние — самый дальнобойный из парка, на остальные — самый маленький подходящий. */
function pickModel(profile: AirlineProfile, km: number): string | undefined {
  const fitting = profile.models
    .filter((model) => (RANGE_KM[model] ?? 0) >= km)
    .sort((a, b) => (RANGE_KM[a] ?? 0) - (RANGE_KM[b] ?? 0));
  return km > 4500 ? fitting.at(-1) : fitting[0];
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** Строит все рейсы расписания относительно сегодняшней даты (по Москве). */
export function buildFlights(catalog: Catalog, today: string): NewFlight[] {
  const modelId = new Map(catalog.aircraftModels.map((m) => [m.model, m.id]));
  const nextNumber = new Map(Object.entries(PROFILES).map(([code, p]) => [code, p.firstNumber]));
  const result: NewFlight[] = [];

  const airportOf = (citySlug: string, airlineCode: string): Airport => {
    const inCity = catalog.airports.filter((a) => a.citySlug === citySlug);
    const preferred = PROFILES[airlineCode]?.moscowAirport;
    const airport = inCity.find((a) => a.iata === preferred) ?? inCity[0];
    if (!airport) throw new Error(`Нет аэропорта в городе ${citySlug}`);
    return airport;
  };

  ROUTES.forEach(([cityA, cityB, perDay, days], routeIndex) => {
    // Своё зерно у каждого маршрута: добавление маршрута не меняет остальные.
    const random = createRandom(20261021 + routeIndex * 7919);
    const km = distanceKm(airportOf(cityA, 'LST'), airportOf(cityB, 'LST'));

    const eligible = catalog.airlines.filter((airline) => {
      const profile = PROFILES[airline.code];
      return profile && km >= profile.minKm && km <= profile.maxKm && pickModel(profile, km);
    });
    const carriers = shuffle(eligible, random).slice(0, perDay >= 4 ? 3 : perDay >= 2 ? 2 : 1);
    if (carriers.length === 0) throw new Error(`Нет авиакомпании для маршрута ${cityA} — ${cityB}`);

    for (const [from, to] of [
      [cityA, cityB],
      [cityB, cityA],
    ] as const) {
      // Слот — ежедневный рейс со своим номером и временем вылета.
      const slots = departureTimes(perDay, random).map((time, i) => {
        const airline = carriers[i % carriers.length] as Airline;
        const profile = PROFILES[airline.code] as AirlineProfile;
        const number = nextNumber.get(airline.code) ?? profile.firstNumber;
        nextNumber.set(airline.code, number + 1);
        return {
          time,
          airline,
          profile,
          number: `${airline.code} ${number}`,
          aircraftModelId: modelId.get(pickModel(profile, km) ?? '') as number,
          origin: airportOf(from, airline.code),
          destination: airportOf(to, airline.code),
        };
      });

      for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) {
        const date = addDays(today, offset);
        if (days && !days.includes(weekday(date))) continue;

        for (const slot of slots) {
          const departsAt = zonedTimeToUtc(date, slot.time, slot.origin.timezone);
          const isPeak = slot.time < '09:00' || slot.time >= '18:00';
          // Спрос немного меняет цену от дня к дню: от −10% до +15%.
          const factor = slot.profile.priceFactor * (0.9 + random() * 0.25) * (isPeak ? 1.05 : 1);
          const prices = basePrices(km, factor);
          result.push({
            number: slot.number,
            airlineId: slot.airline.id,
            aircraftModelId: slot.aircraftModelId,
            originId: slot.origin.id,
            destinationId: slot.destination.id,
            departsAt,
            arrivesAt: new Date(departsAt.getTime() + flightMinutes(km) * 60_000),
            priceEconomy: prices.economy,
            priceBusiness: prices.business,
          });
        }
      }
    }
  });

  return result;
}

export async function seedFlights(db: Db, catalog: Catalog, today: string) {
  const rows = buildFlights(catalog, today);
  // Пачками: в одном запросе PostgreSQL принимает не больше 65 535 параметров.
  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(flights).values(rows.slice(i, i + 1000));
  }
  return rows.length;
}

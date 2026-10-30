import { describe, expect, it } from 'vitest';
import {
  basePrices,
  distanceKm,
  flightMinutes,
  flightScheduleSchema,
  nextFlightNumber,
  planFlights,
  scheduleDates,
  schedulePrices,
  weekday,
  type SchedulePlan,
} from './schedule';

describe('расчёт рейса по расстоянию', () => {
  it('считает расстояние между городами', () => {
    const moscow = { lat: 55.9726, lon: 37.4146 };
    const kaliningrad = { lat: 54.89, lon: 20.5926 };
    expect(distanceKm(moscow, kaliningrad)).toBeGreaterThan(1050);
    expect(distanceKm(moscow, kaliningrad)).toBeLessThan(1150);
  });

  it('время в пути и цена растут с расстоянием', () => {
    expect(flightMinutes(1100)).toBe(120);
    expect(flightMinutes(6400)).toBeGreaterThan(flightMinutes(1100));

    const near = basePrices(600);
    const far = basePrices(6000);
    expect(far.economy).toBeGreaterThan(near.economy);
    expect(near.business).toBeGreaterThan(near.economy);
    expect(near.economy % 10_000).toBe(0); // кратно 100 ₽
  });

  it('определяет день недели', () => {
    expect(weekday('2026-10-19')).toBe(1); // понедельник
    expect(weekday('2026-10-25')).toBe(7); // воскресенье
  });
});

/** Заполненная форма «Добавить рейсы»: всё строками, как приходит из FormData. */
const form = (overrides: Record<string, unknown> = {}) => ({
  airline: 'NRD',
  origin: 'SVO',
  destination: 'MMK',
  aircraftModelId: '1',
  departureTime: '10:30',
  dateFrom: '2026-11-02',
  dateTo: '2026-11-08',
  weekdays: ['1', '3', '5'],
  durationMinutes: '',
  priceEconomy: '',
  priceBusiness: '',
  withReturn: 'on',
  ...overrides,
});

const errorPaths = (input: Record<string, unknown>) => {
  const parsed = flightScheduleSchema.safeParse(input);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'));
};

describe('форма «Добавить рейсы»', () => {
  it('принимает расписание: пустые время в пути и цены — посчитать самим', () => {
    const parsed = flightScheduleSchema.parse(form());
    expect(parsed.weekdays).toEqual([1, 3, 5]);
    expect(parsed.withReturn).toBe(true);
    expect(parsed.durationMinutes).toBeUndefined();
    expect(parsed.priceEconomy).toBeUndefined();
    expect(flightScheduleSchema.parse(form({ withReturn: '' })).withReturn).toBe(false);
  });

  it('не принимает одинаковые аэропорты, перевёрнутый и слишком длинный период', () => {
    expect(errorPaths(form({ destination: 'SVO' }))).toContain('destination');
    expect(errorPaths(form({ dateTo: '2026-11-01' }))).toContain('dateTo');
    expect(errorPaths(form({ dateTo: '2027-06-01' }))).toContain('dateTo');
  });

  it('пустая форма — ошибки полей, а не исключение', () => {
    const paths = errorPaths(form({ dateFrom: '', dateTo: '', airline: '', weekdays: [] }));
    expect(paths).toEqual(expect.arrayContaining(['dateFrom', 'dateTo', 'airline', 'weekdays']));
  });

  it('требует день недели, авиакомпанию и самолёт', () => {
    expect(errorPaths(form({ weekdays: [] }))).toContain('weekdays');
    expect(errorPaths(form({ airline: '' }))).toContain('airline');
    expect(errorPaths(form({ aircraftModelId: '' }))).toContain('aircraftModelId');
  });

  it('бизнес не дешевле эконома, цены — целые рубли в разумных пределах', () => {
    expect(errorPaths(form({ priceEconomy: '9000', priceBusiness: '5000' }))).toContain(
      'priceBusiness',
    );
    expect(errorPaths(form({ priceEconomy: '12.5' }))).toContain('priceEconomy');
    expect(errorPaths(form({ priceEconomy: '9000', priceBusiness: '24000' }))).toEqual([]);
  });
});

describe('расписание', () => {
  it('берёт только выбранные дни недели периода', () => {
    // 2 ноября 2026 — понедельник.
    expect(
      scheduleDates({ dateFrom: '2026-11-02', dateTo: '2026-11-08', weekdays: [1, 3, 5] }),
    ).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(scheduleDates({ dateFrom: '2026-11-03', dateTo: '2026-11-03', weekdays: [1] })).toEqual(
      [],
    );
  });

  const plan: SchedulePlan = {
    airlineId: 7,
    aircraftModelId: 1,
    origin: { id: 1, timezone: 'Europe/Moscow' },
    destination: { id: 2, timezone: 'Asia/Vladivostok' },
    number: 'NRD 100',
    returnNumber: 'NRD 101',
    durationMinutes: 120,
    prices: { economy: 900_000, business: 2_430_000 },
  };

  it('вылет — по местному времени, обратный рейс — после стоянки, с другим номером', () => {
    const rows = planFlights(
      {
        dateFrom: '2026-11-02',
        dateTo: '2026-11-02',
        weekdays: [1],
        departureTime: '10:30',
        withReturn: true,
      },
      plan,
    );
    expect(rows).toHaveLength(2);
    const [there, back] = rows;
    // 10:30 по Москве — 07:30 UTC.
    expect(there?.departsAt.toISOString()).toBe('2026-11-02T07:30:00.000Z');
    expect(there?.arrivesAt.toISOString()).toBe('2026-11-02T09:30:00.000Z');
    expect([there?.originId, there?.destinationId, there?.number]).toEqual([1, 2, 'NRD 100']);
    // Стоянка 90 минут.
    expect(back?.departsAt.toISOString()).toBe('2026-11-02T11:00:00.000Z');
    expect([back?.originId, back?.destinationId, back?.number]).toEqual([2, 1, 'NRD 101']);
    expect(back?.priceEconomy).toBe(900_000);
  });

  it('без обратных рейсов — только туда', () => {
    const rows = planFlights(
      {
        dateFrom: '2026-11-02',
        dateTo: '2026-11-08',
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        departureTime: '23:50',
        withReturn: false,
      },
      plan,
    );
    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.originId === 1)).toBe(true);
  });

  it('цены: введённые — в копейки, бизнес без цены — от эконома, пустые — по расстоянию', () => {
    expect(schedulePrices({ priceEconomy: 9000, priceBusiness: 20000 }, 1000)).toEqual({
      economy: 900_000,
      business: 2_000_000,
    });
    expect(schedulePrices({ priceEconomy: 9000, priceBusiness: undefined }, 1000)).toEqual({
      economy: 900_000,
      business: 2_430_000,
    });
    expect(schedulePrices({ priceEconomy: undefined, priceBusiness: undefined }, 1000)).toEqual(
      basePrices(1000),
    );
  });

  it('номер рейса — следующий после самого большого, у новой авиакомпании — с сотого', () => {
    expect(nextFlightNumber('LST', ['LST 1000', 'LST 1017', 'LST 1003'])).toBe(1018);
    expect(nextFlightNumber('NRD', [])).toBe(100);
  });
});

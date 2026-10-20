import { describe, expect, it } from 'vitest';
import { searchQuerySchema } from './model';
import { isSearchDateAllowed, toOffers, type FlightRow } from './search';

const A320 = {
  businessRows: 3,
  businessLayout: 'AC-DF',
  economyRows: 24,
  economyLayout: 'ABC-DEF',
};
const MSK = { iata: 'SVO', name: 'Шереметьево', city: 'Москва', timezone: 'Europe/Moscow' };
const KGD = { iata: 'KGD', name: 'Храброво', city: 'Калининград', timezone: 'Europe/Kaliningrad' };

function row(id: string, overrides: Partial<FlightRow> = {}): FlightRow {
  return {
    id,
    number: `LST ${id}`,
    airline: { code: 'LST', name: 'Ластавиа', logo: '', color: '#2E4A7D', baggageIncluded: false },
    aircraft: { manufacturer: 'Airbus', model: 'A320neo' },
    origin: MSK,
    destination: KGD,
    departsAt: new Date('2026-11-14T05:40:00Z'),
    arrivesAt: new Date('2026-11-14T08:05:00Z'),
    priceEconomy: 520_000,
    priceBusiness: 1_400_000,
    layout: A320,
    ...overrides,
  };
}

const query: Parameters<typeof toOffers>[1] = {
  cabinClass: 'economy',
  passengers: 2,
  airlines: [],
  sort: 'price',
};

describe('проверка запроса', () => {
  const valid = {
    from: 'moscow',
    to: 'kaliningrad',
    date: '2026-11-14',
    passengers: '2',
    cabinClass: 'economy',
  };

  it('принимает корректный запрос и приводит число пассажиров из строки', () => {
    const parsed = searchQuerySchema.parse(valid);
    expect(parsed.passengers).toBe(2);
    expect(parsed.sort).toBe('price');
    expect(parsed.airlines).toEqual([]);
  });

  it('пассажиров от 1 до 6', () => {
    expect(searchQuerySchema.safeParse({ ...valid, passengers: '0' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ...valid, passengers: '7' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ...valid, passengers: '6' }).success).toBe(true);
  });

  it('отклоняет неизвестный класс и мусор вместо города', () => {
    expect(searchQuerySchema.safeParse({ ...valid, cabinClass: 'first' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ...valid, from: "moscow'; drop" }).success).toBe(false);
  });
});

describe('дата поиска', () => {
  it('от сегодняшнего дня до 60 дней вперёд', () => {
    expect(isSearchDateAllowed('2026-11-14', '2026-11-14')).toBe(true);
    expect(isSearchDateAllowed('2026-11-14', '2027-01-13')).toBe(true);
    expect(isSearchDateAllowed('2026-11-14', '2027-01-14')).toBe(false);
    expect(isSearchDateAllowed('2026-11-14', '2026-11-13')).toBe(false);
  });
});

describe('предложения рейсов', () => {
  it('считает длительность и берёт цену выбранного класса', () => {
    const [economy] = toOffers([row('1')], query);
    expect(economy).toMatchObject({ durationMinutes: 145, price: 520_000, seatsLeft: 144 });

    const [business] = toOffers([row('1')], { ...query, cabinClass: 'business' });
    expect(business).toMatchObject({ price: 1_400_000, seatsLeft: 12 });
  });

  it('скрывает рейсы, где мест не хватает на всех пассажиров', () => {
    const taken = new Map([['1', 143]]); // в экономе осталось 1 место
    expect(toOffers([row('1')], query, taken)).toHaveLength(0);
    expect(toOffers([row('1')], { ...query, passengers: 1 }, taken)).toHaveLength(1);
  });

  it('фильтрует по авиакомпаниям', () => {
    const kirra = row('2', {
      airline: { code: 'KRR', name: 'Кирра', logo: '', color: '#3B78A0', baggageIncluded: true },
    });
    const offers = toOffers([row('1'), kirra], { ...query, airlines: ['KRR'] });
    expect(offers.map((offer) => offer.id)).toEqual(['2']);
  });

  it('сортирует по цене, времени вылета и длительности', () => {
    const cheapLate = row('cheap', {
      priceEconomy: 390_000,
      departsAt: new Date('2026-11-14T15:00:00Z'),
      arrivesAt: new Date('2026-11-14T18:00:00Z'),
    });
    const early = row('early', {
      departsAt: new Date('2026-11-14T03:00:00Z'),
      arrivesAt: new Date('2026-11-14T05:20:00Z'),
    });
    const rows = [row('base'), cheapLate, early];

    expect(toOffers(rows, query).map((o) => o.id)).toEqual(['cheap', 'early', 'base']);
    expect(toOffers(rows, { ...query, sort: 'departure' }).map((o) => o.id)).toEqual([
      'early',
      'base',
      'cheap',
    ]);
    expect(toOffers(rows, { ...query, sort: 'duration' }).map((o) => o.id)).toEqual([
      'early',
      'base',
      'cheap',
    ]);
  });
});

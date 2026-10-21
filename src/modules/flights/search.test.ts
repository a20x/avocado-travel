import { describe, expect, it } from 'vitest';
import { searchQuerySchema } from './model';
import {
  airlineFacets,
  buildOffers,
  defaultSearchDate,
  departurePeriod,
  filterOffers,
  isSearchDateAllowed,
  searchUrl,
  sortOffers,
  type FlightRow,
} from './search';

const A320 = {
  businessRows: 3,
  businessLayout: 'AC-DF',
  economyRows: 24,
  economyLayout: 'ABC-DEF',
};
const MSK = {
  iata: 'SVO',
  name: 'Шереметьево',
  city: 'Москва',
  citySlug: 'moscow',
  timezone: 'Europe/Moscow',
};
const KGD = {
  iata: 'KGD',
  name: 'Храброво',
  city: 'Калининград',
  citySlug: 'kaliningrad',
  timezone: 'Europe/Kaliningrad',
};

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

const economy2 = { cabinClass: 'economy', passengers: 2 } as const;
const noFilters = { airlines: [], times: [], baggage: false };

const KIRRA = { code: 'KRR', name: 'Кирра', logo: '', color: '#3B78A0', baggageIncluded: true };

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
    expect(parsed).toMatchObject(noFilters);
  });

  it('для короткой ссылки подставляет одного пассажира и эконом', () => {
    const parsed = searchQuerySchema.parse({ from: 'moscow', to: 'kazan', date: '2026-11-14' });
    expect(parsed).toMatchObject({ passengers: 1, cabinClass: 'economy' });
  });

  it('повторяющийся параметр — массив, одиночный — тоже массив', () => {
    const one = searchQuerySchema.parse({ ...valid, airlines: 'LST', times: 'morning' });
    expect(one).toMatchObject({ airlines: ['LST'], times: ['morning'] });
    const many = searchQuerySchema.parse({ ...valid, airlines: ['LST', 'KRR'], baggage: 'on' });
    expect(many).toMatchObject({ airlines: ['LST', 'KRR'], baggage: true });
  });

  it('пассажиров от 1 до 6', () => {
    expect(searchQuerySchema.safeParse({ ...valid, passengers: '0' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ...valid, passengers: '7' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ...valid, passengers: '6' }).success).toBe(true);
  });

  it('отклоняет неизвестный класс, время суток и мусор вместо города', () => {
    expect(searchQuerySchema.safeParse({ ...valid, cabinClass: 'first' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ...valid, times: 'night' }).success).toBe(false);
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

  it('по умолчанию — завтра по Москве', () => {
    // 22:30 UTC — в Москве уже 22 октября, значит завтра 23-е.
    expect(defaultSearchDate(new Date('2026-10-21T22:30:00Z'))).toBe('2026-10-23');
    expect(defaultSearchDate(new Date('2026-10-21T10:00:00Z'))).toBe('2026-10-22');
  });
});

describe('предложения рейсов', () => {
  it('считает длительность и берёт цену выбранного класса', () => {
    const [economy] = buildOffers([row('1')], economy2);
    expect(economy).toMatchObject({ durationMinutes: 145, price: 520_000, seatsLeft: 144 });

    const [business] = buildOffers([row('1')], { ...economy2, cabinClass: 'business' });
    expect(business).toMatchObject({ price: 1_400_000, seatsLeft: 12 });
  });

  it('скрывает рейсы, где мест не хватает на всех пассажиров', () => {
    const taken = new Map([['1', 143]]); // в экономе осталось 1 место
    expect(buildOffers([row('1')], economy2, taken)).toHaveLength(0);
    expect(buildOffers([row('1')], { ...economy2, passengers: 1 }, taken)).toHaveLength(1);
  });

  it('собирает авиакомпании с самой низкой ценой, от дешёвой', () => {
    const offers = buildOffers(
      [
        row('1'),
        row('2', { priceEconomy: 480_000 }),
        row('3', { airline: KIRRA, priceEconomy: 450_000 }),
      ],
      economy2,
    );
    expect(airlineFacets(offers).map((f) => [f.code, f.minPrice])).toEqual([
      ['KRR', 450_000],
      ['LST', 480_000],
    ]);
  });
});

describe('фильтры', () => {
  // Вылеты по Москве: 08:40 (утро), 14:00 (день), 21:30 (вечер), 02:00 (ночь).
  const offers = buildOffers(
    [
      row('morning'),
      row('day', { airline: KIRRA, departsAt: new Date('2026-11-14T11:00:00Z') }),
      row('evening', { departsAt: new Date('2026-11-14T18:30:00Z') }),
      row('night', { departsAt: new Date('2026-11-13T23:00:00Z') }),
    ],
    economy2,
  );
  const ids = (list: { id: string }[]) => list.map((o) => o.id);

  it('без фильтров — все рейсы', () => {
    expect(filterOffers(offers, noFilters)).toHaveLength(4);
  });

  it('по авиакомпаниям и багажу', () => {
    expect(ids(filterOffers(offers, { ...noFilters, airlines: ['KRR'] }))).toEqual(['day']);
    expect(ids(filterOffers(offers, { ...noFilters, baggage: true }))).toEqual(['day']);
  });

  it('по времени вылета в часовом поясе города вылета', () => {
    expect(departurePeriod('05:59')).toBeNull();
    expect(departurePeriod('06:00')).toBe('morning');
    expect(departurePeriod('12:00')).toBe('day');
    expect(departurePeriod('23:59')).toBe('evening');

    const result = filterOffers(offers, { ...noFilters, times: ['morning', 'evening'] });
    expect(ids(result)).toEqual(['morning', 'evening']);
  });
});

describe('сортировка', () => {
  it('по цене, времени вылета и длительности', () => {
    const cheapLate = row('cheap', {
      priceEconomy: 390_000,
      departsAt: new Date('2026-11-14T15:00:00Z'),
      arrivesAt: new Date('2026-11-14T18:00:00Z'),
    });
    const early = row('early', {
      departsAt: new Date('2026-11-14T03:00:00Z'),
      arrivesAt: new Date('2026-11-14T05:20:00Z'),
    });
    const offers = buildOffers([row('base'), cheapLate, early], economy2);
    const ids = (sort: 'price' | 'departure' | 'duration') =>
      sortOffers(offers, sort).map((o) => o.id);

    expect(ids('price')).toEqual(['cheap', 'early', 'base']);
    expect(ids('departure')).toEqual(['early', 'base', 'cheap']);
    expect(ids('duration')).toEqual(['early', 'base', 'cheap']);
  });
});

describe('ссылка на поиск', () => {
  it('пишет только то, что отличается от значений по умолчанию', () => {
    expect(searchUrl({ from: 'moscow', to: 'kazan', date: '2026-11-14' })).toBe(
      '/flights?from=moscow&to=kazan&date=2026-11-14',
    );
  });

  it('повторяет параметр для каждого значения фильтра', () => {
    const url = searchUrl({
      from: 'moscow',
      to: 'kazan',
      date: '2026-11-14',
      passengers: 2,
      cabinClass: 'business',
      sort: 'duration',
      airlines: ['LST', 'KRR'],
      times: ['evening'],
      baggage: true,
    });
    expect(url).toBe(
      '/flights?from=moscow&to=kazan&date=2026-11-14&passengers=2&cabinClass=business&sort=duration&airlines=LST&airlines=KRR&times=evening&baggage=on',
    );
    // Ссылка разбирается обратно в тот же запрос.
    const params = new URL(url, 'http://localhost').searchParams;
    const parsed = searchQuerySchema.parse({
      ...Object.fromEntries(params),
      airlines: params.getAll('airlines'),
      times: params.getAll('times'),
    });
    expect(parsed).toMatchObject({ passengers: 2, airlines: ['LST', 'KRR'], baggage: true });
  });
});

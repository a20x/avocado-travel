import { describe, expect, it } from 'vitest';
import {
  DB_SECTIONS,
  dbHref,
  dbQuerySchema,
  fillScores,
  formatBytes,
  formatSql,
  clampToSales,
  directoryChoices,
  pickAirline,
  salesPeriod,
  scheduleTotal,
  sectionHref,
  sectionOf,
  share,
} from './model';

describe('вкладка «БД»: параметры формы', () => {
  it('по умолчанию — поиск по одному атрибуту без условий, первая страница', () => {
    expect(dbQuerySchema.parse({})).toEqual({
      report: 'airline',
      sort: 'departure',
      page: 1,
      from: undefined,
      to: undefined,
      airline: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });

  it('пустые поля не ограничивают, мусор не применяется', () => {
    const query = dbQuerySchema.parse({
      report: 'airlines',
      from: '',
      to: "'; drop table flights; --",
      airline: 'KRR',
      dateFrom: '2026-13-40',
      page: 'abc',
    });
    expect(query).toMatchObject({ report: 'airlines', airline: 'KRR', page: 1 });
    expect(query.from).toBeUndefined();
    expect(query.to).toBeUndefined();
    expect(query.dateFrom).toBeUndefined();
  });

  it('перепутанные даты меняются местами', () => {
    expect(dbQuerySchema.parse({ dateFrom: '2026-09-30', dateTo: '2026-07-01' })).toMatchObject({
      dateFrom: '2026-07-01',
      dateTo: '2026-09-30',
    });
  });

  it('адрес результата — только заполненные поля', () => {
    const query = dbQuerySchema.parse({ report: 'flights', from: 'moscow', sort: 'sold' });
    expect(dbHref(query, 3)).toBe('/database?report=flights&from=moscow&sort=sold&page=3');
    expect(dbHref({ report: 'ratings' })).toBe('/database?report=ratings');
  });
});

describe('вкладка «БД»: меню разделов', () => {
  it('пункты — словами преподавателя, поиск рейсов — шестым', () => {
    expect(DB_SECTIONS.map((section) => section.label)).toEqual([
      'Ввод',
      'Поиск по одному атрибуту',
      'Поиск по двум атрибутам',
      'Агрегация',
      'Сведения о БД',
      'Поиск рейсов',
    ]);
  });

  it('четыре сводки — один раздел «Агрегация», первой открываются рейсы по авиакомпаниям', () => {
    for (const view of ['schedule', 'airlines', 'months', 'ratings'] as const) {
      expect(sectionOf(view).label).toBe('Агрегация');
    }
    expect(sectionHref(sectionOf('months'))).toBe('/database?report=schedule');
    expect(sectionOf('routes').label).toBe('Поиск по двум атрибутам');
  });

  it('разделы без запроса тоже открываются по адресу, неизвестный — поиск по одному атрибуту', () => {
    expect(dbQuerySchema.parse({ report: 'input' }).report).toBe('input');
    expect(dbQuerySchema.parse({ report: 'about' }).report).toBe('about');
    expect(dbQuerySchema.parse({ report: 'drop' }).report).toBe('airline');
  });
});

describe('вкладка «БД»: поиск по одному атрибуту', () => {
  const options = [
    { code: 'STR', name: 'Стрива' },
    { code: 'ALT', name: 'Альтэйра' },
    { code: 'STR', name: 'Стрива' },
    { code: 'LST', name: 'Ластавиа' },
  ];

  it('варианты — без повторов и по алфавиту', () => {
    expect(pickAirline(options, undefined).options.map((option) => option.name)).toEqual([
      'Альтэйра',
      'Ластавиа',
      'Стрива',
    ]);
  });

  it('выбрана запрошенная авиакомпания, если она в списке, иначе — первая', () => {
    expect(pickAirline(options, 'LST').selected).toBe('LST');
    expect(pickAirline(options, 'NOP').selected).toBe('ALT');
    expect(pickAirline(options, undefined).selected).toBe('ALT');
    expect(pickAirline([], 'LST').selected).toBeUndefined();
  });

  it('адрес следующей страницы сохраняет авиакомпанию', () => {
    expect(dbHref({ report: 'airline', airline: 'LST' }, 2)).toBe(
      '/database?report=airline&airline=LST&page=2',
    );
  });
});

describe('вкладка «БД»: итог рейсов по авиакомпаниям', () => {
  const row = (airline: string, flights: number, avgPrice: number, minPrice = 0, maxPrice = 0) => ({
    airline,
    flights,
    upcoming: flights / 2,
    routes: flights ? 2 : 0,
    minPrice,
    avgPrice,
    maxPrice,
  });

  it('суммы, крайние цены и средняя с весом числа рейсов', () => {
    expect(
      scheduleTotal([row('А', 30, 10_000, 5_000, 20_000), row('Б', 10, 30_000, 25_000, 40_000)]),
    ).toEqual({
      flights: 40,
      upcoming: 20,
      routes: 4,
      minPrice: 5_000,
      avgPrice: 15_000,
      maxPrice: 40_000,
    });
  });

  it('авиакомпания без рейсов не тянет минимальную цену к нулю', () => {
    expect(scheduleTotal([row('А', 4, 8_000, 6_000, 9_000), row('Новая', 0, 0)])).toMatchObject({
      flights: 4,
      minPrice: 6_000,
      avgPrice: 8_000,
    });
  });

  it('новые рейсы увеличивают итог', () => {
    const before = scheduleTotal([row('А', 4, 8_000)]);
    const after = scheduleTotal([row('А', 4, 8_000), row('Новая', 14, 9_000)]);
    expect(after.flights).toBeGreaterThan(before.flights);
    expect(after.routes).toBeGreaterThan(before.routes);
  });

  it('пустой справочник — нули', () => {
    expect(scheduleTotal([])).toEqual({
      flights: 0,
      upcoming: 0,
      routes: 0,
      minPrice: 0,
      avgPrice: 0,
      maxPrice: 0,
    });
  });
});

describe('вкладка «БД»: показ результатов', () => {
  it('все пять оценок, даже без голосов', () => {
    expect(fillScores([{ score: 5, count: 3 }])).toEqual([
      { score: 1, count: 0 },
      { score: 2, count: 0 },
      { score: 3, count: 0 },
      { score: 4, count: 0 },
      { score: 5, count: 3 },
    ]);
  });

  it('доля с одним знаком, без деления на ноль', () => {
    expect(share(3, 8)).toBe(37.5);
    expect(share(1, 0)).toBe(0);
  });

  it('объём базы — в понятных единицах', () => {
    expect(formatBytes(512)).toBe('512 Б');
    expect(formatBytes(44_201_663)).toBe('42,2 МБ');
  });

  it('SQL — каждое предложение с новой строки', () => {
    expect(
      formatSql(
        'select "a" from "flights" inner join "airlines" on x where "a" = $1 group by "a" order by "a" limit $2',
      ),
    ).toBe(
      'select "a"\nfrom "flights"\ninner join "airlines" on x\nwhere "a" = $1\ngroup by "a"\norder by "a"\nlimit $2',
    );
  });
});

describe('вкладка «БД»: даты сводок — в периоде продаж', () => {
  const spans = [
    { airline: 'ALT', first: '2026-05-10', last: '2026-11-01' },
    { airline: 'LST', first: '2026-06-01', last: '2026-11-04' },
  ];

  it('период — по всем авиакомпаниям или по одной; без продаж — без ограничений', () => {
    expect(salesPeriod(spans)).toEqual({ first: '2026-05-10', last: '2026-11-04' });
    expect(salesPeriod(spans, 'LST')).toEqual({ first: '2026-06-01', last: '2026-11-04' });
    expect(salesPeriod(spans, 'NOP')).toBeNull();
    expect(salesPeriod([])).toBeNull();
  });

  it('даты вне периода подтягиваются к его краям, внутри — не меняются', () => {
    const period = { first: '2026-05-10', last: '2026-11-04' };
    expect(clampToSales({ dateFrom: '2026-01-01', dateTo: '2026-06-15' }, period)).toEqual({
      dateFrom: '2026-05-10',
      dateTo: '2026-06-15',
    });
    // Период целиком после продаж — их последний день, а не пустой результат.
    expect(clampToSales({ dateFrom: '2027-01-01', dateTo: '2027-02-01' }, period)).toEqual({
      dateFrom: '2026-11-04',
      dateTo: '2026-11-04',
    });
    expect(clampToSales({ dateFrom: undefined, dateTo: undefined }, period)).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(clampToSales({ dateFrom: '2020-01-01' }, null)).toEqual({ dateFrom: '2020-01-01' });
  });
});

describe('вкладка «БД»: поиск по справочникам', () => {
  const rows = [
    { country: 'Россия', city: 'moscow', name: 'Москва', part: 'Европа', zone: 'Europe/Moscow' },
    { country: 'Россия', city: 'kazan', name: 'Казань', part: 'Европа', zone: 'Europe/Moscow' },
    { country: 'Турция', city: 'istanbul', name: 'Стамбул', part: 'Азия', zone: 'Europe/Istanbul' },
  ];
  const names = { moscow: 'Москва', kazan: 'Казань', istanbul: 'Стамбул' };

  it('значения в списках без повторов и по алфавиту, город — с названием', () => {
    const { options } = directoryChoices(rows, ['country', 'city'], names);
    expect(options.country?.map((option) => option.label)).toEqual(['Россия', 'Турция']);
    expect(options.city).toEqual([
      { value: 'kazan', label: 'Казань' },
      { value: 'moscow', label: 'Москва' },
      { value: 'istanbul', label: 'Стамбул' },
    ]);
  });

  it('сочетания — только по полям поиска и без повторов', () => {
    const { combos } = directoryChoices(rows, ['part', 'zone'], names);
    expect(combos).toEqual([
      { part: 'Европа', zone: 'Europe/Moscow' },
      { part: 'Азия', zone: 'Europe/Istanbul' },
    ]);
  });

  it('город с цифрой в адресе — допустимый параметр поиска', () => {
    expect(dbQuerySchema.parse({ to: 'novyy-2', city: 'novyy-2' })).toMatchObject({
      to: 'novyy-2',
      city: 'novyy-2',
    });
  });
});

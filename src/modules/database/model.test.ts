import { describe, expect, it } from 'vitest';
import { dbHref, dbQuerySchema, fillScores, formatBytes, formatSql, share } from './model';

describe('вкладка «БД»: параметры формы', () => {
  it('по умолчанию — поиск рейсов без условий, первая страница', () => {
    expect(dbQuerySchema.parse({})).toEqual({
      report: 'flights',
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

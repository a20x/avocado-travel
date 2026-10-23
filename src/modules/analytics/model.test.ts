import { describe, expect, it } from 'vitest';
import {
  fillMonths,
  formatRubCompact,
  monthLabel,
  monthShortLabel,
  monthsOf,
  occupancyBy,
  parseAnalyticsFilter,
  percent,
  sharesOf,
} from './model';

const TODAY = '2026-10-23';

describe('parseAnalyticsFilter', () => {
  it('по умолчанию — шесть месяцев целиком, включая текущий', () => {
    expect(parseAnalyticsFilter({}, '2026-02-10').from).toBe('2025-09-01');
    expect(parseAnalyticsFilter({}, TODAY)).toEqual({
      from: '2026-05-01',
      to: TODAY,
      airline: undefined,
      destination: undefined,
    });
  });

  it('принимает период, авиакомпанию и направление', () => {
    expect(
      parseAnalyticsFilter(
        { from: '2026-07-01', to: '2026-07-31', airline: 'KRR', destination: 'sochi' },
        TODAY,
      ),
    ).toEqual({ from: '2026-07-01', to: '2026-07-31', airline: 'KRR', destination: 'sochi' });
  });

  it('будущее не показывается, перепутанные даты меняются местами, мусор отбрасывается', () => {
    expect(parseAnalyticsFilter({ to: '2027-01-01' }, TODAY).to).toBe(TODAY);
    expect(parseAnalyticsFilter({ from: '2026-08-31', to: '2026-08-01' }, TODAY)).toMatchObject({
      from: '2026-08-01',
      to: '2026-08-31',
    });
    expect(
      parseAnalyticsFilter({ from: 'вчера', airline: 'krr; drop', destination: '' }, TODAY),
    ).toMatchObject({ from: '2026-05-01', airline: undefined, destination: undefined });
  });
});

describe('месяцы периода', () => {
  it('все месяцы по порядку, через границу года', () => {
    expect(monthsOf({ from: '2025-11-15', to: '2026-02-01' })).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    expect(monthsOf({ from: '2026-07-01', to: '2026-07-31' })).toEqual(['2026-07']);
  });

  it('подписи по-русски', () => {
    expect(monthLabel('2026-07')).toBe('июль 2026');
    expect(monthShortLabel('2026-08')).toBe('авг');
  });

  it('месяцы без продаж — нулями', () => {
    const rows = fillMonths({ from: '2026-05-10', to: '2026-07-01' }, [
      { month: '2026-06', revenue: 500_00, orders: 2 },
    ]);
    expect(rows.map((row) => [row.month, row.revenue, row.orders])).toEqual([
      ['2026-05', 0, 0],
      ['2026-06', 500_00, 2],
      ['2026-07', 0, 0],
    ]);
  });
});

describe('доли и заполняемость', () => {
  it('процент с одним знаком, при нуле в знаменателе — 0', () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(5, 0)).toBe(0);
  });

  it('доли в сумме дают ровно 100', () => {
    const shares = sharesOf([
      { key: 'a', label: 'А', value: 1 },
      { key: 'b', label: 'Б', value: 1 },
      { key: 'c', label: 'В', value: 1 },
    ]);
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(100, 5);
    expect(sharesOf([{ key: 'a', label: 'А', value: 0 }])[0]?.percent).toBe(0);
  });

  it('заполняемость складывает рейсы и места группы и сортирует по убыванию', () => {
    const rows = [
      { airline: 'Кирра', flights: 10, sold: 30, seatsPerFlight: 100 },
      { airline: 'Кирра', flights: 10, sold: 10, seatsPerFlight: 50 },
      { airline: 'Стрива', flights: 5, sold: 50, seatsPerFlight: 100 },
    ];
    expect(occupancyBy(rows, (row) => row.airline)).toEqual([
      { label: 'Стрива', flights: 5, seats: 500, sold: 50, percent: 10 },
      { label: 'Кирра', flights: 20, seats: 1500, sold: 40, percent: 2.7 },
    ]);
  });
});

describe('formatRubCompact', () => {
  it('копейки → короткая сумма в рублях', () => {
    expect(formatRubCompact(312_339_000_00).replace(/\s/g, ' ')).toBe('312,3 млн ₽');
  });
});

import { describe, expect, it } from 'vitest';
import { formatDifference, monthGrid, monthTitle, zoneDifference } from './model';

const at = new Date('2026-10-23T09:00:00Z');

describe('разница поясов', () => {
  it('считает, на сколько один город впереди другого', () => {
    expect(zoneDifference('Europe/Moscow', 'Asia/Vladivostok', at)).toBe(7 * 60);
    expect(zoneDifference('Europe/Moscow', 'Europe/Kaliningrad', at)).toBe(-60);
    expect(zoneDifference('Europe/Moscow', 'Europe/Istanbul', at)).toBe(0);
  });

  it('подписывает разницу', () => {
    expect(formatDifference(420)).toBe('+7 ч');
    expect(formatDifference(-60)).toBe('−1 ч');
    expect(formatDifference(150)).toBe('+2 ч 30 мин');
    expect(formatDifference(-30)).toBe('−30 мин');
    expect(formatDifference(0)).toBe('то же время');
  });
});

describe('календарь', () => {
  it('недели с понедельника, лишние клетки пустые', () => {
    // 1 октября 2026 — четверг.
    const weeks = monthGrid('2026-10');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.at(-1)?.slice(-2)).toEqual(['2026-10-31', null]);
  });

  it('февраль невисокосного года с понедельника — ровно четыре недели', () => {
    expect(monthGrid('2027-02')).toHaveLength(4);
  });

  it('название месяца', () => {
    expect(monthTitle('2026-10')).toBe('Октябрь 2026');
  });
});

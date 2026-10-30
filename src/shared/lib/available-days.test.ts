import { describe, expect, it } from 'vitest';
import { mergeDaySpans, nearestDates, weekdaysLabel } from './available-days';

describe('дни с рейсами', () => {
  it('объединяет периоды маршрутов и их дни недели', () => {
    expect(
      mergeDaySpans([
        { first: '2026-05-02', last: '2026-12-28', weekdays: [1, 3, 5] },
        { first: '2026-05-03', last: '2026-12-29', weekdays: [7, 3] },
      ]),
    ).toEqual({ first: '2026-05-02', last: '2026-12-29', weekdays: [1, 3, 5, 7] });
    expect(mergeDaySpans([])).toBeNull();
  });

  it('подписывает дни недели', () => {
    expect(weekdaysLabel([1, 2, 3, 4, 5, 6, 7])).toBe('каждый день');
    expect(weekdaysLabel([7, 1, 3, 5])).toBe('по пн, ср, пт, вс');
  });

  it('выбирает ближайшие к периоду даты, по порядку', () => {
    const dates = ['2026-11-01', '2026-11-04', '2026-11-12', '2026-11-20', '2026-10-30'];
    // Период 10–11 ноября: ближе всего 12-е, потом 4-е, потом 1-е.
    expect(nearestDates(dates, '2026-11-10', '2026-11-11')).toEqual([
      '2026-11-01',
      '2026-11-04',
      '2026-11-12',
    ]);
    expect(nearestDates(dates, '2026-11-20', '2026-11-20', 1)).toEqual(['2026-11-20']);
    expect(nearestDates([], '2026-11-20', '2026-11-20')).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { buildSeatMap } from './seat-map';
import { EXTRA_LEGROOM_PRICE, selectionTotal, toggleSeat } from './seat-selection';

const a320 = {
  businessRows: 3,
  businessLayout: 'AC-DF',
  economyRows: 24,
  economyLayout: 'ABC-DEF',
};
const prices = { economy: 520_000, business: 1_400_000 };

describe('схема мест рейса', () => {
  const map = buildSeatMap(a320, prices, new Set(['1A', '5C']));
  const seat = (id: string) => map.flatMap((row) => row.groups.flat()).find((s) => s.id === id);

  it('берёт цену класса и добавляет доплату за место для ног', () => {
    expect(seat('1C')?.price).toBe(1_400_000);
    expect(seat('5A')?.price).toBe(520_000);
    expect(seat('4A')?.price).toBe(520_000 + EXTRA_LEGROOM_PRICE);
  });

  it('отмечает занятые места', () => {
    expect(seat('1A')?.taken).toBe(true);
    expect(seat('5C')?.taken).toBe(true);
    expect(seat('5D')?.taken).toBe(false);
  });
});

describe('выбор мест', () => {
  it('отмечает и снимает место', () => {
    expect(toggleSeat([], '7D', 2)).toEqual(['7D']);
    expect(toggleSeat(['7D', '7E'], '7D', 2)).toEqual(['7E']);
  });

  it('сверх числа пассажиров новое место заменяет самое раннее', () => {
    expect(toggleSeat(['7D', '7E'], '8A', 2)).toEqual(['7E', '8A']);
    expect(toggleSeat(['7D'], '8A', 1)).toEqual(['8A']);
  });

  it('считает сумму за выбранные места', () => {
    const map = new Map([
      ['4A', 610_000],
      ['5A', 520_000],
    ]);
    expect(selectionTotal(['4A', '5A'], map)).toBe(1_130_000);
  });
});

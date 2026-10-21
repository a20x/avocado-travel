import { describe, expect, it } from 'vitest';
import { buildCabin, listSeats, parseLayout, seatCapacity, seatClass } from './cabin';

const a320 = {
  businessRows: 3,
  businessLayout: 'AC-DF',
  economyRows: 24,
  economyLayout: 'ABC-DEF',
};
const b777 = {
  businessRows: 8,
  businessLayout: 'AC-DG-HK',
  economyRows: 38,
  economyLayout: 'ABC-DEFG-HJK',
};

describe('parseLayout', () => {
  it('делит ряд на группы по проходам', () => {
    expect(parseLayout('ABC-DEF')).toEqual([
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
    ]);
    expect(parseLayout('ABC-DEFG-HJK')).toHaveLength(3);
  });

  it('отклоняет букву I, повторы и пустые группы', () => {
    expect(() => parseLayout('ABC-DEFGHI')).toThrow();
    expect(() => parseLayout('ABC-CDE')).toThrow();
    expect(() => parseLayout('ABC--DEF')).toThrow();
    expect(() => parseLayout('')).toThrow();
  });
});

describe('салон самолёта', () => {
  it('нумерует ряды сквозь оба класса', () => {
    const rows = buildCabin(a320);
    expect(rows).toHaveLength(27);
    expect(rows[0]).toMatchObject({ number: 1, cabinClass: 'business' });
    expect(rows[3]).toMatchObject({ number: 4, cabinClass: 'economy' });
  });

  it('отмечает ряды с местом для ног: первый в экономе и у выхода посередине', () => {
    const extra = buildCabin(a320)
      .filter((row) => row.extraLegroom)
      .map((row) => row.number);
    // Эконом — ряды 4–27: первый — 4-й, выход после 12 рядов эконома — 16-й.
    expect(extra).toEqual([4, 16]);
  });

  it('считает вместимость по классам', () => {
    expect(seatCapacity(a320)).toEqual({ business: 12, economy: 144 });
    expect(seatCapacity(b777)).toEqual({ business: 48, economy: 380 });
  });

  it('число кресел в списке совпадает с вместимостью', () => {
    const seats = listSeats(a320);
    expect(seats).toHaveLength(156);
    expect(seats.slice(0, 4)).toEqual(['1A', '1C', '1D', '1F']);
    expect(new Set(seats).size).toBe(seats.length);
  });

  it('определяет класс кресла и отвергает несуществующие', () => {
    expect(seatClass(a320, '2C')).toBe('business');
    expect(seatClass(a320, '12B')).toBe('economy');
    expect(seatClass(a320, '2B')).toBeNull(); // в бизнесе A320 нет кресла B
    expect(seatClass(a320, '28A')).toBeNull(); // такого ряда нет
    expect(seatClass(a320, 'abc')).toBeNull();
  });
});

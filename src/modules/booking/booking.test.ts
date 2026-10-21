import { describe, expect, it } from 'vitest';
import { buildSeatMap } from '@/modules/flights';
import { isExpiryValid, normalizeCardNumber, passesLuhn } from './card';
import { bookingRequestSchema, cardSchema, createOrderSchema } from './model';
import { PNR_ALPHABET, generatePnr, isPnr } from './pnr';
import { priceSeats, totalOf } from './pricing';

describe('код брони', () => {
  it('6 символов без похожих 0, O, 1, I', () => {
    for (let i = 0; i < 200; i++) {
      const pnr = generatePnr();
      expect(pnr).toHaveLength(6);
      expect(pnr).not.toMatch(/[0O1I]/);
      expect(isPnr(pnr)).toBe(true);
    }
  });

  it('каждый байт превращается в символ алфавита', () => {
    const pnr = generatePnr((bytes) => bytes.map((_, i) => i * 33));
    expect(pnr).toBe([0, 1, 2, 3, 4, 5].map((i) => PNR_ALPHABET[(i * 33) % 32]).join(''));
    expect(isPnr('AB0CDE')).toBe(false);
  });
});

describe('демо-карта', () => {
  const now = new Date('2026-10-21T12:00:00Z');

  it('алгоритм Луна', () => {
    expect(passesLuhn('4242424242424242')).toBe(true);
    expect(passesLuhn('4242424242424241')).toBe(false);
    expect(passesLuhn('79927398713')).toBe(true);
  });

  it('срок действия до конца указанного месяца', () => {
    expect(isExpiryValid('10/26', now)).toBe(true);
    expect(isExpiryValid('09/26', now)).toBe(false);
    expect(isExpiryValid('13/30', now)).toBe(false);
    expect(isExpiryValid('1/30', now)).toBe(false);
  });

  it('проверяет карту целиком, пробелы в номере не мешают', () => {
    expect(normalizeCardNumber('4242 4242-4242 4242')).toBe('4242424242424242');
    const schema = cardSchema(now);
    expect(
      schema.safeParse({ number: '4242 4242 4242 4242', expiry: '12/28', cvc: '123' }).success,
    ).toBe(true);
    const bad = schema.safeParse({ number: '4242 4242 4242 4241', expiry: '01/20', cvc: '12' });
    expect(bad.error?.issues.map((issue) => issue.path[0])).toEqual(['number', 'expiry', 'cvc']);
  });
});

describe('запрос брони', () => {
  const flight = '5f0c7a3e-1d2b-4c5d-8e9f-0a1b2c3d4e5f';

  it('одно место — тоже массив; места не повторяются; не больше 6', () => {
    expect(
      bookingRequestSchema.parse({ flight, cabinClass: 'economy', seats: '7D' }).seats,
    ).toEqual(['7D']);
    expect(
      bookingRequestSchema.safeParse({ flight, cabinClass: 'economy', seats: ['7D', '7D'] })
        .success,
    ).toBe(false);
    expect(
      bookingRequestSchema.safeParse({ flight, cabinClass: 'economy', seats: [] }).success,
    ).toBe(false);
    const seven = ['1A', '2A', '3A', '4A', '5A', '6A', '7A'];
    expect(
      bookingRequestSchema.safeParse({ flight, cabinClass: 'economy', seats: seven }).success,
    ).toBe(false);
  });

  it('по пассажиру на место, имена — буквы', () => {
    const base = { flight, cabinClass: 'economy', seats: ['7D', '7E'] };
    const anna = { firstName: 'Анна', lastName: 'Петрова-Водкина' };
    expect(createOrderSchema.safeParse({ ...base, passengers: [anna, anna] }).success).toBe(true);
    expect(createOrderSchema.safeParse({ ...base, passengers: [anna] }).success).toBe(false);
    const digits = { firstName: 'Анна1', lastName: 'Петрова' };
    expect(createOrderSchema.safeParse({ ...base, passengers: [anna, digits] }).success).toBe(
      false,
    );
  });
});

describe('цена мест', () => {
  const a320 = {
    businessRows: 3,
    businessLayout: 'AC-DF',
    economyRows: 24,
    economyLayout: 'ABC-DEF',
  };
  const map = buildSeatMap(a320, { economy: 520_000, business: 1_400_000 }, new Set(['8A']));

  it('берёт цену со схемы, с доплатой за место для ног', () => {
    const result = priceSeats(map, 'economy', ['4A', '7C']);
    expect(result).toEqual({
      ok: true,
      data: [
        { seat: '4A', price: 610_000, extraLegroom: true },
        { seat: '7C', price: 520_000, extraLegroom: false },
      ],
    });
    expect(totalOf(result.ok ? result.data : [])).toBe(1_130_000);
  });

  it('не продаёт занятое, несуществующее и место другого класса', () => {
    expect(priceSeats(map, 'economy', ['8A'])).toEqual({ ok: false, error: 'SEAT_UNAVAILABLE' });
    expect(priceSeats(map, 'economy', ['99A'])).toEqual({ ok: false, error: 'SEAT_UNAVAILABLE' });
    expect(priceSeats(map, 'economy', ['1A'])).toEqual({ ok: false, error: 'SEAT_UNAVAILABLE' });
  });
});

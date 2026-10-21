import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatPrice, plural } from './format';

// Intl разделяет разряды неразрывным пробелом — в ожиданиях заменяем его обычным.
const spaces = (text: string) => text.replace(/\s/g, ' ');

describe('форматирование', () => {
  it('цена из копеек в рублях без копеек', () => {
    expect(spaces(formatPrice(520_000))).toBe('5 200 ₽');
    expect(spaces(formatPrice(1_890_000))).toBe('18 900 ₽');
  });

  it('длительность в часах и минутах', () => {
    expect(formatDuration(145)).toBe('2 ч 25 мин');
    expect(formatDuration(60)).toBe('1 ч');
    expect(formatDuration(40)).toBe('40 мин');
  });

  it('слово в форме для числа', () => {
    const forms: [string, string, string] = ['рейс', 'рейса', 'рейсов'];
    expect(plural(1, forms)).toBe('рейс');
    expect(plural(3, forms)).toBe('рейса');
    expect(plural(11, forms)).toBe('рейсов');
    expect(plural(21, forms)).toBe('рейс');
    expect(plural(25, forms)).toBe('рейсов');
  });

  it('дата словами', () => {
    expect(formatDate('2026-11-14')).toBe('14 ноября');
    expect(formatDate('2026-11-14', { weekday: true })).toBe('сб, 14 ноября');
  });
});

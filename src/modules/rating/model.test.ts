import { describe, expect, it } from 'vitest';
import { formatAverage, ratingInputSchema, starFill } from './model';

describe('оценка сайта', () => {
  it('принимается целая оценка от 1 до 5, в том числе строкой из формы', () => {
    expect(ratingInputSchema.parse({ score: '5' }).score).toBe(5);
    expect(ratingInputSchema.safeParse({ score: '0' }).success).toBe(false);
    expect(ratingInputSchema.safeParse({ score: '6' }).success).toBe(false);
    expect(ratingInputSchema.safeParse({ score: '4.5' }).success).toBe(false);
    expect(ratingInputSchema.safeParse({ score: 'пять' }).success).toBe(false);
    expect(ratingInputSchema.safeParse({}).success).toBe(false);
  });

  it('средний балл — с одним знаком после запятой', () => {
    expect(formatAverage(4.6666)).toBe('4,7');
    expect(formatAverage(5)).toBe('5,0');
    expect(formatAverage(3.04)).toBe('3,0');
  });

  it('звёзды закрашиваются по среднему баллу', () => {
    expect([1, 2, 3, 4, 5].map((star) => starFill(4.5, star))).toEqual([1, 1, 1, 1, 0.5]);
    expect(starFill(0, 1)).toBe(0);
  });
});

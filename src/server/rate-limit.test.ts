import { describe, expect, it } from 'vitest';
import { takeRateLimit } from './rate-limit';

describe('ограничение частоты', () => {
  const rule = { limit: 2, windowMs: 60_000 };

  it('пропускает попытки до лимита и отказывает сверх него', () => {
    expect(takeRateLimit('a', rule, 0)).toBe(true);
    expect(takeRateLimit('a', rule, 1_000)).toBe(true);
    expect(takeRateLimit('a', rule, 2_000)).toBe(false);
  });

  it('через окно снова пропускает, у разных ключей свои счётчики', () => {
    expect(takeRateLimit('b', rule, 0)).toBe(true);
    expect(takeRateLimit('b', rule, 0)).toBe(true);
    expect(takeRateLimit('c', rule, 0)).toBe(true);
    expect(takeRateLimit('b', rule, 60_000)).toBe(true);
  });
});

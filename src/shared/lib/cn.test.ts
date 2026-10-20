import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('склеивает классы через пробел', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('пропускает пустые значения', () => {
    const isActive = false;
    expect(cn('a', isActive && 'active', null, undefined, '', 'b')).toBe('a b');
  });
});

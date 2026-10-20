import { describe, expect, it } from 'vitest';
import { buttonClasses } from './Button';

describe('buttonClasses', () => {
  it('по умолчанию — основная кнопка среднего размера', () => {
    const classes = buttonClasses();
    expect(classes).toContain('bg-leaf');
    expect(classes).toContain('px-5');
    expect(classes).not.toContain('w-full');
  });

  it('белый текст бывает только на фоне leaf', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const classes = buttonClasses({ variant }).split(' ');
      const hasWhiteText = classes.includes('text-white');
      expect(hasWhiteText).toBe(classes.includes('bg-leaf'));
    }
  });

  it('растягивается на всю ширину по запросу', () => {
    expect(buttonClasses({ fullWidth: true })).toContain('w-full');
  });
});

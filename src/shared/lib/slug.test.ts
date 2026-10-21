import { describe, expect, it } from 'vitest';
import { SLUG_PATTERN, slugify } from './slug';

describe('адрес из заголовка', () => {
  it('транслитерирует кириллицу и заменяет всё лишнее дефисами', () => {
    expect(slugify('Новые рейсы в Казань')).toBe('novye-reysy-v-kazan');
    expect(slugify('Щедрый «Ёжик»: −15% на билеты!')).toBe('shchedryy-ezhik-15-na-bilety');
    expect(slugify('  A320neo   в парке  ')).toBe('a320neo-v-parke');
  });

  it('результат подходит для адреса и не длиннее 80 символов', () => {
    const slug = slugify('очень '.repeat(30));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toMatch(SLUG_PATTERN);
    expect(slugify('!!!')).toBe('');
  });
});

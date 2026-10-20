import { describe, expect, it } from 'vitest';
import { isNavItemActive, MAIN_NAV, MORE_NAV } from './navigation';

const flights = MAIN_NAV[0]!;
const news = MAIN_NAV.find((item) => item.href === '/news')!;

describe('isNavItemActive', () => {
  it('«Рейсы» активны на главной, в результатах и при оформлении', () => {
    expect(isNavItemActive(flights, '/')).toBe(true);
    expect(isNavItemActive(flights, '/flights')).toBe(true);
    expect(isNavItemActive(flights, '/flights/42')).toBe(true);
    expect(isNavItemActive(flights, '/booking')).toBe(true);
  });

  it('главная не подсвечивается на других страницах', () => {
    expect(isNavItemActive(flights, '/news')).toBe(false);
  });

  it('раздел активен на вложенных страницах', () => {
    expect(isNavItemActive(news, '/news/novyi-reis')).toBe(true);
  });

  it('похожее начало адреса не считается совпадением', () => {
    expect(isNavItemActive(news, '/newsletter')).toBe(false);
  });

  it('адреса в меню не повторяются', () => {
    const hrefs = [...MAIN_NAV, ...MORE_NAV].map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

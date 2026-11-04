import { describe, expect, it } from 'vitest';
import { RSS_VIEWS, mergedRssHref, rssViewHref, rssViewOf } from './rss-tab';

describe('вкладка «RSS»: разделы', () => {
  it('меню — понятными словами, первыми — объединённые новости', () => {
    expect(Object.values(RSS_VIEWS)).toEqual([
      'Объединённые новости',
      'Ввод новостей сайта',
      'Подключить RSS-ленту',
      'Поиск по новостям',
      'Выгрузка и подписка',
      'Разбор RSS-файла',
    ]);
    expect(rssViewOf({})).toBe('merged');
  });

  it('раздел — из адреса; старые ссылки ведут туда же, что раньше', () => {
    expect(rssViewOf({ view: 'input' })).toBe('input');
    expect(rssViewOf({ view: ['feeds', 'x'] })).toBe('feeds');
    expect(rssViewOf({ view: 'drop' })).toBe('merged');
    expect(rssViewOf({ feed: 'https://lenta.ru/rss' })).toBe('merged');
    expect(rssViewOf({ source: 'site' })).toBe('search');
    expect(rssViewOf({ q: 'сочи', sort: 'new' })).toBe('search');
    expect(rssViewOf({ q: '  ' })).toBe('merged');
  });

  it('адреса разделов и RSS объединённых новостей', () => {
    expect(rssViewHref('merged')).toBe('/rss');
    expect(rssViewHref('search')).toBe('/rss?view=search');
    expect(mergedRssHref('https://lenta.ru/rss?a=1&b=2')).toBe(
      '/rss/merged?feed=https%3A%2F%2Flenta.ru%2Frss%3Fa%3D1%26b%3D2',
    );
  });
});

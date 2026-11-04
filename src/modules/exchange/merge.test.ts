import { describe, expect, it } from 'vitest';
import type { CombinedNewsItem } from './combined';
import { feedItemsToNews, feedSourceName, feedUrlSchema, mergeNews } from './merge';

const now = new Date('2026-11-04T12:00:00Z');

describe('feedUrlSchema', () => {
  it('принимает http(s) и обрезает пробелы', () => {
    expect(feedUrlSchema.parse('  https://example.com/rss.xml ')).toBe(
      'https://example.com/rss.xml',
    );
    expect(feedUrlSchema.safeParse('http://example.com/feed').success).toBe(true);
  });

  it('не принимает пустое, другие протоколы и слишком длинное', () => {
    for (const value of ['', 'example.com/rss', 'ftp://example.com/rss', 'javascript:alert(1)']) {
      expect(feedUrlSchema.safeParse(value).success, value).toBe(false);
    }
    expect(feedUrlSchema.safeParse(`https://example.com/${'a'.repeat(500)}`).success).toBe(false);
  });
});

describe('feedSourceName', () => {
  it('подпись источника — сайт без www', () => {
    expect(feedSourceName('https://www.tourdom.ru/rss/')).toBe('tourdom.ru');
    expect(feedSourceName('https://news.example.com/feed.xml')).toBe('news.example.com');
  });
});

describe('feedItemsToNews', () => {
  const item = (title: string, link: string, publishedAt: Date | null = now) => ({
    title,
    link,
    description: '<p>Описание <b>новости</b></p>',
    publishedAt,
  });

  it('текст без HTML, источник и ссылка; без даты или с датой из будущего — «сейчас»', () => {
    const report = feedItemsToNews(
      [
        item('Новый <i>рейс</i>', 'https://example.com/1', new Date('2026-11-01T00:00:00Z')),
        item('Без даты', 'https://example.com/2', null),
        item('Из будущего', 'https://example.com/3', new Date('2027-01-01T00:00:00Z')),
      ],
      'example.com',
      now,
    );
    expect(report.items.map((news) => [news.title, news.publishedAt.toISOString()])).toEqual([
      ['Новый рейс', '2026-11-01T00:00:00.000Z'],
      ['Без даты', now.toISOString()],
      ['Из будущего', now.toISOString()],
    ]);
    expect(report.items[0]).toMatchObject({
      summary: 'Описание новости',
      source: 'example.com',
      url: 'https://example.com/1',
      isExternal: true,
    });
  });

  it('пропускает записи без заголовка или ссылки и про настоящие авиакомпании', () => {
    const report = feedItemsToNews(
      [
        item('', 'https://example.com/1'),
        item('Без ссылки', 'не ссылка'),
        item('Аэрофлот открыл рейс', 'https://example.com/2'),
        item('Обычная новость', 'https://example.com/3'),
      ],
      'example.com',
      now,
    );
    expect(report.items.map((news) => news.title)).toEqual(['Обычная новость']);
    expect(report.skippedInvalid).toBe(2);
    expect(report.skippedAirline).toBe(1);
  });

  it('берёт не больше заданного числа записей', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      item(`Новость ${i}`, `https://example.com/${i}`),
    );
    expect(feedItemsToNews(items, 'example.com', now, 3).items).toHaveLength(3);
  });
});

describe('mergeNews', () => {
  const news = (id: string, isExternal: boolean, day: number): CombinedNewsItem => ({
    id,
    title: id,
    summary: '',
    category: '',
    source: isExternal ? 'example.com' : 'Avocado Travel',
    url: `https://example.com/${id}`,
    publishedAt: new Date(Date.UTC(2026, 10, day)),
    isExternal,
  });

  it('внутренние и внешние — вместе, по убыванию дат', () => {
    const site = [news('s-old', false, 1), news('s-new', false, 6), news('s-mid', false, 3)];
    const feed = [2, 4, 5, 7].map((day) => news(`f${day}`, true, day));
    expect(mergeNews(site, feed).map((item) => item.id)).toEqual([
      'f7',
      's-new',
      'f5',
      'f4',
      's-mid',
      'f2',
      's-old',
    ]);
  });

  it('в одно время первой идёт новость сайта', () => {
    expect(mergeNews([news('s', false, 2)], [news('f', true, 2)]).map((item) => item.id)).toEqual([
      's',
      'f',
    ]);
  });

  it('одна группа пустая или обе — не ломается', () => {
    expect(mergeNews([], [news('f1', true, 1)]).map((item) => item.id)).toEqual(['f1']);
    expect(mergeNews([news('s1', false, 1)], []).map((item) => item.id)).toEqual(['s1']);
    expect(mergeNews([], [])).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  asciiValue,
  combinedAscii,
  combinedCsv,
  combinedHref,
  combinedQuerySchema,
  combinedWrapped,
  combinedXml,
  mixRank,
  toRss,
  type CombinedNewsItem,
} from './combined';
import { feedIdFor, feedInputSchema, isPrivateAddress } from './feeds';
import { parseFeed } from './rss';

const item: CombinedNewsItem = {
  id: 'https://avocado.example/news/sochi',
  title: 'Рейсы в Сочи & <Казань>',
  summary: 'Новые рейсы «каждый день»',
  category: 'Новые направления',
  source: 'Avocado Travel',
  url: 'https://avocado.example/news/sochi',
  publishedAt: new Date('2026-10-20T09:30:00Z'),
  isExternal: false,
};
const channel = {
  title: 'Новости',
  link: 'https://avocado.example/news',
  description: 'Лента',
  selfUrl: 'https://avocado.example/feed.xml',
};

describe('общая лента: порядок «вперемешку»', () => {
  /** Порядок записей: S — новость сайта, E — из внешней ленты. */
  const order = (site: number, feeds: number) =>
    [
      ...Array.from({ length: site }, (_, i) => ({ code: 'S', rank: mixRank(true, i), tie: 0 })),
      ...Array.from({ length: feeds }, (_, i) => ({ code: 'E', rank: mixRank(false, i), tie: 1 })),
    ]
      .sort((a, b) => a.rank - b.rank || a.tie - b.tie)
      .map((item) => item.code)
      .join('');

  it('в каждых пяти записях — две новости сайта и три из лент', () => {
    expect(order(12, 30).slice(0, 20)).toBe('SEESE'.repeat(4));
    expect([...order(12, 30)].filter((code) => code === 'S')).toHaveLength(12);
  });

  it('новости одной группы кончились — дальше идут только другие', () => {
    expect(order(2, 8)).toBe('SEESEEEEEE');
    expect(order(5, 1)).toBe('SESSSS');
  });
});

describe('общая лента: параметры', () => {
  it('мусор в адресе не применяется', () => {
    expect(combinedQuerySchema.parse({ source: 'DROP TABLE', sort: 'x', page: '-3' })).toEqual({
      q: '',
      source: 'all',
      sort: 'mixed',
      page: 1,
    });
  });

  it('адрес — только параметры не по умолчанию; к выгрузке добавляются через &', () => {
    const query = combinedQuerySchema.parse({ q: 'сочи', source: 'site' });
    expect(combinedHref(query)).toBe('/rss?q=%D1%81%D0%BE%D1%87%D0%B8&source=site');
    expect(combinedHref(combinedQuerySchema.parse({}), {}, '/rss/export?format=csv')).toBe(
      '/rss/export?format=csv',
    );
    expect(combinedHref(query, { page: 2 }, '/rss/export?format=xml')).toMatch(
      /^\/rss\/export\?format=xml&q=.+&source=site&page=2$/,
    );
  });
});

describe('общая лента: форматы обмена', () => {
  it('ASCII — только печатные символы ASCII, кириллица — \\uXXXX', () => {
    expect(asciiValue('Сочи "юг"')).toBe('"\\u0421\\u043e\\u0447\\u0438 \\"\\u044e\\u0433\\""');
    const text = combinedAscii([item]);
    expect(text).toMatch(/^[\x20-\x7e\t\r\n]*$/);
    const [fields, row] = text.trim().split('\r\n');
    expect(fields).toBe('id\ttitle\tsummary\tpublished_at\tlink\tsource\tcategory');
    expect(row?.split('\t')).toHaveLength(7);
    expect(JSON.parse(row!.split('\t')[1]!)).toBe(item.title);
  });

  it('ASCII в XML-тегах: список полей и текст внутри payload', () => {
    const xml = combinedWrapped([item]);
    expect(xml).toContain('<fields delimiter="tab" encoding="US-ASCII" escaping="json-string">');
    expect(xml).toContain('<payload>id\ttitle');
  });

  it('XML и CSV — спецсимволы экранированы', () => {
    expect(combinedXml([item])).toContain('<title>Рейсы в Сочи &amp; &lt;Казань&gt;</title>');
    expect(combinedXml([item])).toContain('count="1"');
    expect(combinedCsv([item])).toContain('id;title;summary;published_at;link;source;category');
  });

  it('RSS 2.0 читается нашим же разборщиком лент', () => {
    const rss = toRss(channel, [item], new Date());
    expect(rss).toContain('<pubDate>Tue, 20 Oct 2026 09:30:00 GMT</pubDate>');
    expect(parseFeed(rss)).toEqual([
      {
        title: item.title,
        link: item.url,
        description: item.summary,
        publishedAt: item.publishedAt,
      },
    ]);
  });
});

describe('внешние ленты', () => {
  it('код ленты — из адреса, занятый получает номер', () => {
    expect(feedIdFor('https://www.tourdom.ru/rss/', [])).toBe('tourdom-ru');
    expect(feedIdFor('https://www.tourdom.ru/other', ['tourdom-ru'])).toBe('tourdom-ru-2');
    expect(feedIdFor('https://tourdom.ru/x', ['tourdom-ru', 'tourdom-ru-2'])).toBe('tourdom-ru-3');
  });

  it('форма: только http(s), название и рубрика обязательны', () => {
    expect(
      feedInputSchema.safeParse({ url: 'https://a.ru/rss', name: 'Лента', category: 'travel' })
        .success,
    ).toBe(true);
    expect(
      feedInputSchema.safeParse({ url: 'file:///etc/passwd', name: 'Лента', category: 'travel' })
        .success,
    ).toBe(false);
    expect(
      feedInputSchema.safeParse({ url: 'https://a.ru/rss', name: '', category: 'travel' }).success,
    ).toBe(false);
    expect(
      feedInputSchema.safeParse({ url: 'https://a.ru/rss', name: 'Лента', category: 'news' })
        .success,
    ).toBe(false);
  });

  it('адреса внутренней сети не скачиваются (защита от SSRF)', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.5',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    for (const address of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2a00:1450:4010::64']) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { ExternalFeed } from './feeds';
import {
  autoTags,
  htmlToText,
  linkHash,
  mentionsRealAirline,
  normalizeLink,
  prepareIndustryNews,
  summarize,
} from './industry';
import { decodeFeed, parseFeed, type FeedItem } from './rss';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Лента</title>
    <item>
      <title>Аэропорт Сочи открыл новый терминал</title>
      <link>https://example.org/news/1?utm_source=rss#top</link>
      <description><![CDATA[<p>Терминал&nbsp;примет <b>5 млн</b> пассажиров &laquo;в год&raquo;.</p>]]></description>
      <pubDate>Fri, 23 Oct 2026 09:00:23 +0000</pubDate>
    </item>
    <item>
      <title>2026</title>
      <guid>https://example.org/news/2</guid>
      <content:encoded>Текст из content:encoded</content:encoded>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom</title>
  <entry>
    <title type="html">Новые правила провоза багажа</title>
    <link rel="self" href="https://example.org/self/1"/>
    <link rel="alternate" href="https://example.org/a/1"/>
    <summary>Кратко о багаже</summary>
    <updated>2026-10-20T10:00:00Z</updated>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel><title>RDF</title></channel>
  <item><title>Курорт</title><link>https://example.org/r/1</link><dc:date>2026-10-21T08:00:00Z</dc:date></item>
</rdf:RDF>`;

describe('разбор лент', () => {
  it('RSS 2.0: CDATA с HTML, guid вместо ссылки, content:encoded вместо описания', () => {
    const [first, second] = parseFeed(RSS);
    expect(first).toEqual({
      title: 'Аэропорт Сочи открыл новый терминал',
      link: 'https://example.org/news/1?utm_source=rss#top',
      description: '<p>Терминал&nbsp;примет <b>5 млн</b> пассажиров &laquo;в год&raquo;.</p>',
      publishedAt: new Date('2026-10-23T09:00:23Z'),
    });
    expect(second).toMatchObject({
      title: '2026',
      link: 'https://example.org/news/2',
      description: 'Текст из content:encoded',
      publishedAt: null,
    });
  });

  it('Atom: ссылка — alternate, а не self; дата — updated', () => {
    expect(parseFeed(ATOM)).toEqual([
      {
        title: 'Новые правила провоза багажа',
        link: 'https://example.org/a/1',
        description: 'Кратко о багаже',
        publishedAt: new Date('2026-10-20T10:00:00Z'),
      },
    ]);
  });

  it('RSS 1.0 (RDF): записи рядом с каналом, дата — dc:date', () => {
    expect(parseFeed(RDF)).toMatchObject([
      {
        title: 'Курорт',
        link: 'https://example.org/r/1',
        publishedAt: new Date('2026-10-21T08:00:00Z'),
      },
    ]);
  });

  it('отклоняет DOCTYPE (защита от «billion laughs») и не-ленты', () => {
    expect(() => parseFeed('<!DOCTYPE x [<!ENTITY a "aaa">]><rss/>')).toThrow(/DOCTYPE/);
    expect(() => parseFeed('<html><body>не лента</body></html>')).toThrow(/не RSS/);
  });

  it('кодировка — из Content-Type или объявления XML, по умолчанию UTF-8', () => {
    const cp1251 = new Uint8Array([0xc0, 0xfd, 0xf0, 0xee, 0xef, 0xee, 0xf0, 0xf2]); // «Аэропорт»
    expect(decodeFeed(cp1251, 'application/rss+xml; charset=windows-1251')).toBe('Аэропорт');
    const declared = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><rss/>');
    expect(decodeFeed(declared, null)).toContain('<rss/>');
  });
});

describe('обработка записей', () => {
  it('HTML → текст: без тегов и скриптов, со сущностями, без лишних пробелов', () => {
    expect(
      htmlToText(
        '<p>Терминал&nbsp;примет <b>5 млн</b>&#160;&laquo;в год&raquo;.</p><script>x()</script>',
      ),
    ).toBe('Терминал примет 5 млн «в год».');
    expect(htmlToText('&#x41;&amp;&unknown;')).toBe('A&&unknown;');
  });

  it('краткое описание обрезается по границе слова с многоточием', () => {
    expect(summarize('короткий текст')).toBe('короткий текст');
    expect(summarize('один два три четыре', 12)).toBe('один два…');
  });

  it('ссылка без меток и якоря; не http(s) — отбрасывается', () => {
    expect(normalizeLink('https://example.org/a?utm_source=rss&id=5#top')).toBe(
      'https://example.org/a?id=5',
    );
    expect(normalizeLink('javascript:alert(1)')).toBeNull();
    expect(normalizeLink('не ссылка')).toBeNull();
  });

  it('находит настоящие авиакомпании и рейсы, не путая с обычными словами', () => {
    for (const text of [
      '«Аэрофлот» отменяет рейсы',
      'пассажиры Аэрофлота',
      'Turkish Airlines перенесла рейсы',
      'Авиакомпания EasyJet стала партнёром',
      'взлёт Air Canada Express',
      'авиакомпания «Победа» запустит',
      'рейс SU 1234 задержан',
      'S7 увеличит частоты',
    ]) {
      expect(mentionsRealAirline(text), text).toBe(true);
    }
    for (const text of [
      'Аэропорт Курумоч переходит на зимнее расписание',
      'российские авиакомпании России перевезли больше пассажиров',
      'самолёт A320 и Boeing 737 в парке',
      'День Победы и туризм',
      'Россия открыла новые направления',
    ]) {
      expect(mentionsRealAirline(text), text).toBe(false);
    }
  });

  it('теги — по словарю, слово с начала, окончание любое', () => {
    expect(autoTags('В аэропорту изменили правила провоза багажа и подорожали билеты')).toEqual([
      'аэропорты',
      'багаж',
      'цены',
    ]);
    expect(autoTags('Телевизионный визит')).toEqual([]);
  });

  it('адрес новости устойчив к повторному импорту', () => {
    expect(linkHash('https://example.org/a')).toBe(linkHash('https://example.org/a'));
    expect(linkHash('https://example.org/a')).not.toBe(linkHash('https://example.org/b'));
  });
});

describe('prepareIndustryNews', () => {
  const feed: ExternalFeed = {
    id: 'demo',
    name: 'Демо',
    url: 'https://example.org/rss',
    category: 'travel',
  };
  const now = new Date('2026-10-24T12:00:00Z');
  const item = (overrides: Partial<FeedItem>): FeedItem => ({
    title: 'Аэропорт открыл терминал',
    link: 'https://example.org/1',
    description: '<p>Описание</p>',
    publishedAt: new Date('2026-10-23T12:00:00Z'),
    ...overrides,
  });

  it('готовит новость: текст без HTML, теги, адрес, рубрика ленты', () => {
    const { drafts } = prepareIndustryNews(feed, [item({})], now);
    expect(drafts).toEqual([
      {
        slug: `ext-demo-${linkHash('https://example.org/1')}`,
        title: 'Аэропорт открыл терминал',
        summary: 'Описание',
        category: 'travel',
        tags: ['аэропорты'],
        externalUrl: 'https://example.org/1',
        externalFeed: 'demo',
        publishedAt: new Date('2026-10-23T12:00:00Z'),
      },
    ]);
  });

  it('пропускает неполные, старые, дубли и записи с авиакомпаниями; дата из будущего — «сейчас»', () => {
    const seen = new Set(['https://example.org/seen']);
    const report = prepareIndustryNews(
      feed,
      [
        item({ title: '' }),
        item({ link: 'ftp://example.org/x' }),
        item({ link: 'https://example.org/old', publishedAt: new Date('2026-08-01T00:00:00Z') }),
        item({ link: 'https://example.org/seen' }),
        item({ link: 'https://example.org/1?utm_medium=x' }),
        item({ link: 'https://example.org/1' }),
        item({ link: 'https://example.org/su', title: '«Аэрофлот» сменил расписание' }),
        item({ link: 'https://example.org/future', publishedAt: new Date('2027-01-01T00:00:00Z') }),
      ],
      now,
      seen,
    );
    expect(report.skipped).toEqual({ invalid: 2, old: 1, airline: 1, duplicate: 2 });
    expect(report.drafts.map((draft) => draft.externalUrl)).toEqual([
      'https://example.org/1',
      'https://example.org/future',
    ]);
    expect(report.drafts[1]?.publishedAt).toEqual(now);
  });
});

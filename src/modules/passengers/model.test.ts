import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PASSENGER_GROUPS, PASSENGER_PAGES } from './content';
import {
  PASSENGER_SLUG_PATTERN,
  findPassengerPage,
  groupPassengerPages,
  passengerImageSrc,
  passengerSearchDocuments,
  type PassengerPage,
} from './model';

describe('PASSENGER_PAGES', () => {
  it('не меньше 20 статических страниц — замечание преподавателя по лабе 1', () => {
    expect(PASSENGER_PAGES.length).toBeGreaterThanOrEqual(20);
  });

  it('адреса уникальны и пишутся без кодирования', () => {
    const slugs = PASSENGER_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(PASSENGER_SLUG_PATTERN);
  });

  it('у каждой страницы своя группа, разделы и непустой текст', () => {
    const groups = new Set(PASSENGER_GROUPS.map((group) => group.id));
    for (const page of PASSENGER_PAGES) {
      expect(groups.has(page.group)).toBe(true);
      expect(page.sections.length).toBeGreaterThan(0);
      for (const section of page.sections) expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it('якоря разделов уникальны на странице и не заняты общим макетом', () => {
    // Уже есть на каждой странице: оглавление, «Читайте также», шапка, подвал и счётчик.
    const taken = [
      'page-top',
      'contents',
      'contents-title',
      'related-title',
      'content',
      'site-search',
    ];
    for (const page of PASSENGER_PAGES) {
      const anchors = page.sections.flatMap((section) => [section.id, `${section.id}-title`]);
      for (const anchor of page.sections.map((section) => section.id)) {
        expect(anchor).toMatch(PASSENGER_SLUG_PATTERN);
      }
      expect(new Set([...anchors, ...taken]).size).toBe(anchors.length + taken.length);
    }
  });

  it('«Читайте также» ведёт на существующие страницы, но не на саму себя', () => {
    for (const page of PASSENGER_PAGES) {
      for (const slug of page.related) {
        expect(slug).not.toBe(page.slug);
        expect(findPassengerPage(PASSENGER_PAGES, slug)).toBeDefined();
      }
    }
  });

  it('ссылки «На сайте» ведут на страницы этого сайта', () => {
    const links = PASSENGER_PAGES.flatMap((page) => page.links ?? []);
    for (const link of links) expect(link.href).toMatch(/^\/(?!\/)/);
  });

  it('в таблицах у каждой строки столько же ячеек, сколько в шапке', () => {
    for (const page of PASSENGER_PAGES) {
      for (const block of page.sections.flatMap((section) => section.blocks)) {
        if (block.kind !== 'table') continue;
        expect(block.head.every((cell) => cell.length > 0)).toBe(true);
        for (const row of block.rows) expect(row).toHaveLength(block.head.length);
      }
    }
  });

  it('у каждой страницы есть иллюстрация с той же подписью', () => {
    for (const page of PASSENGER_PAGES) {
      const file = join(process.cwd(), 'public', passengerImageSrc(page.slug));
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, 'utf8')).toContain(`<title id="t">${page.imageAlt}</title>`);
    }
  });
});

describe('groupPassengerPages', () => {
  const page = (slug: string, group: PassengerPage['group']): PassengerPage => ({
    slug,
    group,
    title: slug,
    description: '',
    lead: '',
    imageAlt: '',
    sections: [],
    related: [],
  });

  it('раскладывает страницы по группам в порядке групп и пропускает пустые', () => {
    const grouped = groupPassengerPages(PASSENGER_GROUPS, [
      page('a', 'baggage'),
      page('b', 'before'),
      page('c', 'baggage'),
    ]);
    expect(grouped.map((group) => [group.id, group.pages.map((p) => p.slug)])).toEqual([
      ['before', ['b']],
      ['baggage', ['a', 'c']],
    ]);
  });

  it('все страницы раздела попадают в оглавление', () => {
    const grouped = groupPassengerPages(PASSENGER_GROUPS, PASSENGER_PAGES);
    expect(grouped.flatMap((group) => group.pages)).toHaveLength(PASSENGER_PAGES.length);
  });
});

describe('passengerSearchDocuments', () => {
  it('оглавление и по документу на страницу с текстом всех видов блоков', () => {
    const docs = passengerSearchDocuments([
      {
        slug: 'pets',
        group: 'baggage',
        title: 'Перевозка животных',
        description: '',
        lead: 'Питомцы летят в салоне.',
        imageAlt: '',
        sections: [
          {
            id: 'rules',
            title: 'Правила',
            blocks: [
              { kind: 'text', text: 'Нужна заявка.' },
              { kind: 'list', items: ['Одна переноска.'] },
              {
                kind: 'table',
                caption: 'Цены',
                head: ['Где', 'Цена'],
                rows: [['Салон', '2 900 ₽']],
              },
              { kind: 'tip', text: 'Собаки-проводники бесплатно.' },
            ],
          },
        ],
        related: [],
      },
    ]);
    expect(docs.map((doc) => [doc.refId, doc.url, doc.title, doc.kind])).toEqual([
      ['passengers', '/passengers', 'Пассажирам', 'page'],
      ['passengers:pets', '/passengers/pets', 'Перевозка животных', 'page'],
    ]);
    expect(docs[1]!.body).toBe(
      'Питомцы летят в салоне.\n\nПравила Нужна заявка. Одна переноска. Цены Где Цена Салон 2 900 ₽ Собаки-проводники бесплатно.',
    );
  });
});

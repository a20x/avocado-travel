import { describe, expect, it } from 'vitest';
import { HELP_SECTIONS } from './content';
import { HELP_ANCHOR_PATTERN, helpSearchDocuments } from './model';

describe('HELP_SECTIONS', () => {
  const anchors = HELP_SECTIONS.flatMap((section) => [
    section.id,
    ...section.questions.map((item) => item.id),
    `${section.id}-title`,
    ...section.questions.map((item) => `${item.id}-title`),
  ]);

  it('якоря уникальны на странице — иначе ссылка оглавления ведёт не туда', () => {
    // Уже заняты на странице: оглавление, а в общем макете — содержимое, поиск в шапке, подвал.
    const taken = [
      'contents',
      'contents-title',
      'content',
      'site-search',
      'site-search-mobile',
      'counter-title',
      'rates-title',
    ];
    expect(new Set([...anchors, ...taken]).size).toBe(anchors.length + taken.length);
  });

  it('якоря пишутся без кодирования в адресе', () => {
    for (const anchor of anchors) expect(anchor).toMatch(HELP_ANCHOR_PATTERN);
  });

  it('в каждом разделе есть вопросы, у каждого вопроса — ответ', () => {
    for (const section of HELP_SECTIONS) {
      expect(section.questions.length).toBeGreaterThan(0);
      for (const item of section.questions) expect(item.answer.length).toBeGreaterThan(0);
    }
  });

  it('ссылки «Смотрите также» ведут на страницы сайта', () => {
    const links = HELP_SECTIONS.flatMap((s) => s.questions.flatMap((q) => q.links ?? []));
    // «/» в начале, но не «//» — это был бы чужой сайт.
    for (const link of links) expect(link.href).toMatch(/^\/(?!\/)/);
  });
});

describe('helpSearchDocuments', () => {
  it('один документ на раздел, ведёт к разделу по якорю и содержит вопросы и ответы', () => {
    const docs = helpSearchDocuments([
      {
        id: 'booking',
        title: 'Бронирование',
        questions: [{ id: 'hold', question: 'Сколько держится бронь?', answer: ['15 минут.'] }],
      },
    ]);
    expect(docs).toEqual([
      {
        kind: 'page',
        refId: 'help:booking',
        url: '/help#booking',
        title: 'Справка: Бронирование',
        body: 'Сколько держится бронь? 15 минут.',
        visibleFrom: null,
      },
    ]);
  });
});

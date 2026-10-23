import type { SearchDocumentInput } from '@/modules/search';

/** Вопрос справки. `id` — якорь в адресе: `/help#hold`. */
export type HelpQuestion = {
  id: string;
  question: string;
  /** Абзацы ответа — обычный текст, без HTML. */
  answer: string[];
  /** «Смотрите также» — страницы сайта по теме вопроса. */
  links?: Array<{ href: string; label: string }>;
};

export type HelpSection = {
  id: string;
  title: string;
  questions: HelpQuestion[];
};

/** Якоря: латиница в нижнем регистре, цифры и дефис — без кодирования в адресе. */
export const HELP_ANCHOR_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Документы поискового индекса: по одному на раздел справки — вопросы и ответы раздела.
 * Результат поиска ведёт сразу к разделу по якорю.
 */
export function helpSearchDocuments(sections: HelpSection[]): SearchDocumentInput[] {
  return sections.map((section) => ({
    kind: 'page',
    refId: `help:${section.id}`,
    url: `/help#${section.id}`,
    title: `Справка: ${section.title}`,
    body: section.questions.map((item) => [item.question, ...item.answer].join(' ')).join('\n\n'),
    visibleFrom: null,
  }));
}

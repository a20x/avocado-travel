import type { SearchDocumentInput } from '@/modules/search';

/**
 * Кусок текста страницы. Только обычный текст, без HTML: разметку строят компоненты модуля.
 * `tip` — выделенная плашка «Обратите внимание».
 */
export type PassengerBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'table'; caption: string; head: string[]; rows: string[][] }
  | { kind: 'tip'; text: string };

/** Раздел страницы. `id` — якорь в адресе: `/passengers/baggage#size`. */
export type PassengerSection = {
  id: string;
  title: string;
  blocks: PassengerBlock[];
};

export type PassengerGroupId = 'before' | 'baggage' | 'airport' | 'trouble' | 'company';

export type PassengerGroup = {
  id: PassengerGroupId;
  title: string;
};

/** Статическая страница раздела «Пассажирам»: адрес `/passengers/<slug>`. */
export type PassengerPage = {
  slug: string;
  group: PassengerGroupId;
  title: string;
  /** Описание для поисковиков и карточки в оглавлении раздела. */
  description: string;
  /** Вводный абзац под заголовком. */
  lead: string;
  /** Подпись иллюстрации `/images/passengers/<slug>.svg`. */
  imageAlt: string;
  sections: PassengerSection[];
  /** «Читайте также» — адреса (slug) других страниц раздела. */
  related: string[];
  /** Страницы сайта по теме: поиск рейсов, кабинет, сервисы. */
  links?: Array<{ href: string; label: string }>;
};

export const PASSENGERS_PATH = '/passengers';

/** Якоря и адреса: латиница в нижнем регистре, цифры и дефис — без кодирования в адресе. */
export const PASSENGER_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Пометка на каждой странице раздела: правила выдуманы. Её нельзя убирать — иначе
 * правила учебного проекта можно принять за условия настоящей авиакомпании.
 */
export const PASSENGER_DISCLAIMER =
  'Avocado Travel — учебный проект. Компания, её правила и условия перевозки выдуманы и не относятся к настоящим авиакомпаниям и аэропортам.';

export function passengerPageHref(slug: string): string {
  return `${PASSENGERS_PATH}/${slug}`;
}

export function passengerImageSrc(slug: string): string {
  return `/images/passengers/${slug}.svg`;
}

export function findPassengerPage(pages: PassengerPage[], slug: string): PassengerPage | undefined {
  return pages.find((page) => page.slug === slug);
}

/** Страницы по группам в порядке групп; пустые группы пропускаются. */
export function groupPassengerPages(
  groups: PassengerGroup[],
  pages: PassengerPage[],
): Array<PassengerGroup & { pages: PassengerPage[] }> {
  return groups
    .map((group) => ({ ...group, pages: pages.filter((page) => page.group === group.id) }))
    .filter((group) => group.pages.length > 0);
}

/** Текст блока одной строкой — для поиска по сайту. */
function blockText(block: PassengerBlock): string {
  switch (block.kind) {
    case 'text':
    case 'tip':
      return block.text;
    case 'list':
      return block.items.join(' ');
    case 'table':
      return [block.caption, ...block.head, ...block.rows.flat()].join(' ');
  }
}

/** refId документов индекса: `passengers` — оглавление, `passengers:<slug>` — страницы. */
export const PASSENGERS_REF_PREFIX = 'passengers';

/**
 * Документы поискового индекса: оглавление раздела и по одному на страницу —
 * вводный абзац и текст всех разделов.
 */
export function passengerSearchDocuments(pages: PassengerPage[]): SearchDocumentInput[] {
  const index: SearchDocumentInput = {
    kind: 'page',
    refId: PASSENGERS_REF_PREFIX,
    url: PASSENGERS_PATH,
    title: 'Пассажирам',
    body: `Правила и советы для пассажиров Avocado Travel: ${pages.map((page) => page.title).join(', ')}.`,
    visibleFrom: null,
  };
  return [
    index,
    ...pages.map((page) => ({
      kind: 'page' as const,
      refId: `${PASSENGERS_REF_PREFIX}:${page.slug}`,
      url: passengerPageHref(page.slug),
      title: page.title,
      body: [
        page.lead,
        ...page.sections.map((section) =>
          [section.title, ...section.blocks.map(blockText)].join(' '),
        ),
      ].join('\n\n'),
      visibleFrom: null,
    })),
  ];
}

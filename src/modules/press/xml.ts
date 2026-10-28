import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { formatDate } from '@/shared/lib/format';
import { PRESS_CATEGORIES, pressFileSchema, type PressCategory, type PressRelease } from './model';

/**
 * Пресс-релизы в XML (лаба 2, ADR-0010): тот же набор из 18 записей, что в JSON, —
 * файл content/press/press-releases.xml со схемой XSD и преобразованием XSL рядом.
 * Вкладка «XML» (`/xml`) читает именно XML-файл; совпадение с JSON проверяет тест.
 */
export const PRESS_XML_FILES = {
  xml: '/xml/press-releases.xml',
  xsd: '/xml/press-releases.xsd',
  xsl: '/xml/press-releases.xsl',
  /** Результат XSL-преобразования на сервере — с теми же параметрами, что у таблицы. */
  transform: '/xml/transform',
} as const;

const escapeXml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * XML-файл из пресс-релизов: 7 полей у каждой записи — атрибут `id` и шесть тегов.
 * Инструкция xml-stylesheet просит браузер показать файл через XSL, а
 * `xsi:noNamespaceSchemaLocation` указывает схему XSD.
 */
export function pressToXml(releases: PressRelease[]): string {
  const items = releases.map(
    (release) => `  <release id="${release.id}">
    <title>${escapeXml(release.title)}</title>
    <date>${release.date}</date>
    <category>${release.category}</category>
    <author>${escapeXml(release.author)}</author>
    <summary>${escapeXml(release.summary)}</summary>
    <body>${escapeXml(release.body)}</body>
  </release>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="press-releases.xsl"?>
<!-- Пресс-релизы Avocado Travel. Файл собирается из press-releases.json командой pnpm press:xml. -->
<pressReleases xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="press-releases.xsd">
${items.join('\n')}
</pressReleases>
`;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Числа и даты — как текст: схема Zod сама проверит формат.
  parseTagValue: false,
  isArray: (name) => name === 'release',
});

/** XML-файл → пресс-релизы, проверенные той же схемой, что и JSON. */
export function parsePressXml(text: string): PressRelease[] {
  const document: unknown = parser.parse(text);
  const root = z
    .object({ pressReleases: z.object({ release: z.array(z.unknown()).default([]) }) })
    .safeParse(document);
  if (!root.success) throw new Error('В press-releases.xml нет корневого элемента pressReleases');

  const parsed = pressFileSchema.safeParse({
    releases: root.data.pressReleases.release.map((item) =>
      // Атрибуты пространства имён к данным не относятся.
      typeof item === 'object' && item
        ? Object.fromEntries(Object.entries(item).filter(([key]) => !key.includes(':')))
        : item,
    ),
  });
  if (!parsed.success) {
    throw new Error(`Ошибка в content/press/press-releases.xml:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data.releases;
}

/** Колонки таблицы — все семь полей записи. */
export const XML_COLUMNS = {
  id: 'Код',
  title: 'Заголовок',
  date: 'Дата',
  category: 'Категория',
  author: 'Автор',
  summary: 'Кратко',
  body: 'Текст',
} as const;
export type XmlColumn = keyof typeof XML_COLUMNS;
const columnKeys = Object.keys(XML_COLUMNS) as [XmlColumn, ...XmlColumn[]];

export const XML_ORDERS = { asc: 'По возрастанию', desc: 'По убыванию' } as const;
export type XmlOrder = keyof typeof XML_ORDERS;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const param = z.preprocess(first, z.string());
const list = z.preprocess(
  (value) => (value === undefined ? [] : [value].flat()),
  z.array(z.unknown()),
);

/**
 * Параметры таблицы из адреса `/xml?q=…&category=…&author=…&sort=date&order=desc&cols=…`.
 * Непонятное значение не ломает страницу, а просто не применяется.
 */
export const xmlQuerySchema = z.object({
  q: param.pipe(z.string().trim().max(100)).catch(''),
  category: param
    .pipe(z.enum(Object.keys(PRESS_CATEGORIES) as [PressCategory, ...PressCategory[]]))
    .optional()
    .catch(undefined),
  author: param.pipe(z.string().trim().min(1).max(60)).optional().catch(undefined),
  sort: param.pipe(z.enum(columnKeys)).catch('date'),
  order: param.pipe(z.enum(['asc', 'desc'])).catch('desc'),
  /** Видимые колонки; ни одной — значит все. */
  cols: list.transform((values) => columnKeys.filter((key) => values.includes(key))),
});
export type XmlQuery = z.infer<typeof xmlQuerySchema>;

export type XmlRow = { id: string; cells: Record<XmlColumn, string> };

export type XmlTableView = {
  rows: XmlRow[];
  total: number;
  query: XmlQuery;
  columns: XmlColumn[];
  authors: string[];
};

/** Сколько символов текста показывать в ячейке: искать можно по всему тексту. */
const BODY_PREVIEW = 160;

function cellsOf(release: PressRelease): Record<XmlColumn, string> {
  const body = release.body.replace(/\s+/g, ' ');
  return {
    id: release.id,
    title: release.title,
    date: formatDate(release.date, { year: true }),
    category: PRESS_CATEGORIES[release.category],
    author: release.author,
    summary: release.summary,
    body: body.length > BODY_PREVIEW ? `${body.slice(0, BODY_PREVIEW).trimEnd()}…` : body,
  };
}

const normalize = (text: string) => text.toLowerCase().replaceAll('ё', 'е');

/** Текст записи для поиска: все поля целиком, дата — и как в файле, и как на странице. */
function searchText(release: PressRelease): string {
  return normalize(
    [
      release.id,
      release.title,
      release.date,
      formatDate(release.date, { year: true }),
      release.date.split('-').reverse().join('.'),
      release.category,
      PRESS_CATEGORIES[release.category],
      release.author,
      release.summary,
      release.body,
    ].join('\n'),
  );
}

/** Значение для сортировки: дата — как в файле (ГГГГ-ММ-ДД), категория — по подписи. */
function sortValue(release: PressRelease, column: XmlColumn): string {
  return column === 'category' ? PRESS_CATEGORIES[release.category] : release[column];
}

/**
 * Таблица вкладки «XML» (L2-03, L2-04): поиск набора символов во всех колонках, выборка
 * по категории и автору, сортировка по любой колонке в обе стороны, выбор видимых колонок.
 */
export function buildXmlTable(releases: PressRelease[], requested: XmlQuery): XmlTableView {
  const authors = [...new Set(releases.map((release) => release.author))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  );
  const query: XmlQuery = {
    ...requested,
    author: requested.author && authors.includes(requested.author) ? requested.author : undefined,
  };
  const needle = normalize(query.q);
  const direction = query.order === 'asc' ? 1 : -1;

  const rows = releases
    .filter((release) => !query.category || release.category === query.category)
    .filter((release) => !query.author || release.author === query.author)
    .filter((release) => !needle || searchText(release).includes(needle))
    .sort(
      (a, b) =>
        direction * sortValue(a, query.sort).localeCompare(sortValue(b, query.sort), 'ru') ||
        a.id.localeCompare(b.id),
    )
    .map((release) => ({ id: release.id, cells: cellsOf(release) }));

  return {
    rows,
    total: releases.length,
    query,
    columns: query.cols.length > 0 ? query.cols : columnKeys,
    authors,
  };
}

/** Адрес таблицы с другими параметрами — для заголовков-ссылок сортировки и «Сбросить». */
export function xmlHref(query: XmlQuery, change: Partial<XmlQuery> = {}, path = '/xml'): string {
  const next = { ...query, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.category) params.set('category', next.category);
  if (next.author) params.set('author', next.author);
  if (next.sort !== 'date') params.set('sort', next.sort);
  if (next.order !== 'desc') params.set('order', next.order);
  for (const column of next.cols) params.append('cols', column);
  return params.size > 0 ? `${path}?${params}` : path;
}

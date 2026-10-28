import { z } from 'zod';
import { toCsv, type ExportTable } from './csv';

/**
 * Общая лента вкладки «RSS» (лаба 4): новости сайта и новости подключённых внешних лент в одном
 * списке — с поиском, выборкой по источнику и выгрузкой в форматах обмена из методички:
 * CSV, XML, RSS, текст ASCII через разделитель со списком полей и ASCII в XML-тегах.
 */

export const COMBINED_SORTS = {
  new: 'Сначала новые',
  old: 'Сначала старые',
  title: 'По заголовку',
} as const;
export type CombinedSort = keyof typeof COMBINED_SORTS;

export const COMBINED_PAGE_SIZE = 20;
/** Сколько записей попадает в выгрузку: этого хватает на всю ленту. */
export const EXPORT_LIMIT = 500;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const param = z.preprocess(first, z.string());

/**
 * Параметры ленты из адреса: `/rss?q=…&source=…&sort=…&page=…`. Источник — все, только
 * сайт, все внешние или код одной ленты. Непонятное значение не применяется.
 */
export const combinedQuerySchema = z.object({
  q: param.pipe(z.string().trim().max(100)).catch(''),
  source: param.pipe(z.string().regex(/^[a-z0-9-]{1,60}$/)).catch('all'),
  sort: param
    .pipe(z.enum(Object.keys(COMBINED_SORTS) as [CombinedSort, ...CombinedSort[]]))
    .catch('new'),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000)).catch(1),
});
export type CombinedQuery = z.infer<typeof combinedQuerySchema>;

/** Новость общей ленты: адрес — уже абсолютный, на сайт или на источник. */
export type CombinedNewsItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  /** «Avocado Travel» или название внешней ленты. */
  source: string;
  url: string;
  publishedAt: Date;
  isExternal: boolean;
};

export const EXCHANGE_FORMATS = {
  csv: { label: 'CSV', extension: 'csv', type: 'text/csv; charset=utf-8' },
  xml: { label: 'XML', extension: 'xml', type: 'application/xml; charset=utf-8' },
  rss: { label: 'RSS', extension: 'xml', type: 'application/rss+xml; charset=utf-8' },
  txt: { label: 'TXT (ASCII)', extension: 'txt', type: 'text/plain; charset=us-ascii' },
  wrapped: {
    label: 'ASCII в XML-тегах',
    extension: 'xml',
    type: 'application/xml; charset=utf-8',
  },
} as const;
export type ExchangeFormat = keyof typeof EXCHANGE_FORMATS;

/** Поля записи в выгрузке — одни и те же во всех форматах. */
export const EXCHANGE_FIELDS = [
  'id',
  'title',
  'summary',
  'published_at',
  'link',
  'source',
  'category',
] as const;

function fieldsOf(item: CombinedNewsItem): Record<(typeof EXCHANGE_FIELDS)[number], string> {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    published_at: item.publishedAt.toISOString(),
    link: item.url,
    source: item.source,
    category: item.category,
  };
}

export const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** CSV: точка с запятой и BOM — как остальные выгрузки сайта (L4-03). */
export function combinedCsv(items: CombinedNewsItem[]): string {
  const table: ExportTable = {
    columns: EXCHANGE_FIELDS.map((key) => ({ key, label: key })),
    rows: items.map(fieldsOf),
  };
  return toCsv(table);
}

/** XML: каждая новость — элемент `<item>` с семью полями. */
export function combinedXml(items: CombinedNewsItem[]): string {
  const records = items.map((item) => {
    const fields = fieldsOf(item);
    const tags = EXCHANGE_FIELDS.map((key) => `    <${key}>${escapeXml(fields[key])}</${key}>`);
    return `  <item>\n${tags.join('\n')}\n  </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<news version="1" count="${items.length}">\n${records.join('\n')}\n</news>\n`;
}

export type RssChannel = { title: string; link: string; description: string; selfUrl: string };

/**
 * RSS 2.0 (https://www.rssboard.org/rss-specification): канал и записи. Дата — в формате
 * RFC 822, как требует спецификация; `guid` — постоянная ссылка на новость.
 */
export function toRss(channel: RssChannel, items: CombinedNewsItem[], now: Date): string {
  const records = items.map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${escapeXml(item.summary)}</description>
      <category>${escapeXml(item.category)}</category>
      <source url="${escapeXml(channel.selfUrl)}">${escapeXml(item.source)}</source>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${item.publishedAt.toUTCString()}</pubDate>
    </item>`,
  );
  const lastBuild = items[0]?.publishedAt ?? now;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>ru</language>
    <atom:link href="${escapeXml(channel.selfUrl)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
${records.join('\n')}
  </channel>
</rss>
`;
}

/**
 * Значение в чистом ASCII: строка в кавычках, кириллица и прочее — `\uXXXX`, как в JSON.
 * Так файл читается любой программой без договорённости о кодировке.
 */
export function asciiValue(text: string): string {
  return JSON.stringify(text).replace(
    /[^\x20-\x7e]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

const TAB = '\t';

/** Текст ASCII через разделитель (табуляция): первая строка — список полей. */
export function combinedAscii(items: CombinedNewsItem[]): string {
  const lines = [
    EXCHANGE_FIELDS.join(TAB),
    ...items.map((item) => {
      const fields = fieldsOf(item);
      return EXCHANGE_FIELDS.map((key) => asciiValue(fields[key])).join(TAB);
    }),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * «ASCII-файл, оконтуренный XML-тегами»: тот же текст ASCII внутри `<payload>`, а в `<fields>` —
 * список полей и правила разбора (разделитель, кодировка, экранирование).
 */
export function combinedWrapped(items: CombinedNewsItem[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<newsTransfer version="1" count="${items.length}">
  <fields delimiter="tab" encoding="US-ASCII" escaping="json-string">${EXCHANGE_FIELDS.join(TAB)}</fields>
  <payload>${escapeXml(combinedAscii(items))}</payload>
</newsTransfer>
`;
}

/** Выгрузка в выбранном формате. */
export function exportCombined(
  format: ExchangeFormat,
  items: CombinedNewsItem[],
  channel: RssChannel,
  now: Date,
): string {
  switch (format) {
    case 'csv':
      return combinedCsv(items);
    case 'xml':
      return combinedXml(items);
    case 'rss':
      return toRss(channel, items, now);
    case 'txt':
      return combinedAscii(items);
    case 'wrapped':
      return combinedWrapped(items);
  }
}

/** Адрес ленты с параметрами — только не по умолчанию; `path` — страница или выгрузка. */
export function combinedHref(
  query: CombinedQuery,
  change: Partial<CombinedQuery> = {},
  path = '/rss',
): string {
  const next = { ...query, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.source !== 'all') params.set('source', next.source);
  if (next.sort !== 'new') params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));
  const search = params.toString();
  return search ? `${path}${path.includes('?') ? '&' : '?'}${search}` : path;
}

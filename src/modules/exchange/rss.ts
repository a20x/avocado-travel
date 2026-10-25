import { XMLParser } from 'fast-xml-parser';

/** Запись ленты в одном виде, из какого бы формата она ни пришла. */
export type FeedItem = {
  title: string;
  link: string;
  /** Описание как есть — часто с HTML внутри. */
  description: string;
  publishedAt: Date | null;
};

/** Больше этого лента не разбирается: нормальной ленте хватает сотен килобайт. */
export const MAX_FEED_BYTES = 5 * 1024 * 1024;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  // Числа и даты не превращаем: заголовок «2026» должен остаться строкой.
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ['item', 'entry', 'link', 'category'].includes(name),
});

type Node = Record<string, unknown>;

/** Текст узла: строка, число или объект с текстом и атрибутами. */
function text(value: unknown): string {
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) return text((value as Node)['#text']);
  return '';
}

function date(value: unknown): Date | null {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Ссылка RSS — текст `<link>`, ссылка Atom — атрибут `href` у `<link rel="alternate">`. */
function linkOf(value: unknown): string {
  const links = Array.isArray(value) ? value : [value];
  const atom = links.find(
    (link): link is Node =>
      typeof link === 'object' &&
      link !== null &&
      '@_href' in link &&
      ((link as Node)['@_rel'] ?? 'alternate') === 'alternate',
  );
  return atom ? text(atom['@_href']) : text(links[0]);
}

/**
 * Записи ленты RSS 2.0, RSS 1.0 (RDF) или Atom. Документ с DOCTYPE отклоняется: через
 * объявления сущностей в нём можно раздуть разбор до гигабайт («billion laughs»).
 */
export function parseFeed(xml: string): FeedItem[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Лента с DOCTYPE не принимается');
  const doc = parser.parse(xml) as Node;

  const rss = doc.rss as Node | undefined;
  const rdf = doc['rdf:RDF'] as Node | undefined;
  const atom = doc.feed as Node | undefined;

  if (rss || rdf) {
    const channel = (rss?.channel ?? rdf ?? {}) as Node;
    const items = ((channel.item ?? rdf?.item ?? []) as Node[]).filter(Boolean);
    return items.map((item) => ({
      title: text(item.title),
      link: linkOf(item.link) || text(item.guid),
      description: text(item.description) || text(item['content:encoded']),
      publishedAt: date(item.pubDate ?? item['dc:date']),
    }));
  }
  if (atom) {
    return ((atom.entry ?? []) as Node[]).map((entry) => ({
      title: text(entry.title),
      link: linkOf(entry.link),
      description: text(entry.summary) || text(entry.content),
      publishedAt: date(entry.published ?? entry.updated),
    }));
  }
  throw new Error('Это не RSS и не Atom');
}

/**
 * Текст ленты из байтов. Кодировка — из заголовка Content-Type или из объявления
 * `<?xml … encoding="…"?>`, по умолчанию UTF-8: русские ленты встречаются и в windows-1251.
 */
export function decodeFeed(bytes: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder('ascii').decode(bytes.subarray(0, 200));
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ??
    /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

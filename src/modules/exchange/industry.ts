import type { ExternalFeed } from './feeds';
import type { FeedItem } from './rss';

/**
 * Обработка импортированных новостей (L4-06): очистка HTML, ссылка без меток, отсев дублей,
 * старых записей и записей с настоящими авиакомпаниями, автоматические теги.
 * Чистые функции — без сети и базы, проверяются тестами.
 */

/** Новость отрасли, готовая к сохранению. Полный текст не храним — только краткое описание и ссылку. */
export type IndustryNewsDraft = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  externalUrl: string;
  externalFeed: string;
  publishedAt: Date;
};

export type PrepareReport = {
  drafts: IndustryNewsDraft[];
  skipped: { invalid: number; old: number; airline: number; duplicate: number };
};

/** Записи старше этого не импортируем, а уже сохранённые — удаляем: раздел про свежие новости. */
export const INDUSTRY_MAX_AGE_DAYS = 30;
/** Из одной ленты за раз — не больше, чтобы одна болтливая лента не заняла весь раздел. */
export const ITEMS_PER_FEED = 30;
const SUMMARY_LENGTH = 300;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  rsquo: '’',
  lsquo: '‘',
};

/** HTML описания → обычный текст: без тегов, со сущностями, без лишних пробелов. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
      return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Краткое описание: до 300 знаков по границе слова, с многоточием, если обрезано. */
export function summarize(text: string, length = SUMMARY_LENGTH): string {
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : length).replace(/[\s,.;:—-]+$/, '')}…`;
}

/** Ссылка для сравнения дублей: только http(s), без меток рекламы (utm_*) и якоря. */
export function normalizeLink(link: string): string | null {
  try {
    const url = new URL(link.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'from' || key === 'ref') url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Упоминает ли текст настоящую авиакомпанию или её рейс. В проекте авиакомпании выдуманные,
 * поэтому такие новости не импортируются (решение автора, docs/05-api.md).
 * Русские названия — основой слова (склоняются), латинские — целым словом;
 * плюс приметы: «авиакомпания «…»» или латиницей, «… Airlines», «рейс SU 1234».
 */
// prettier-ignore
const AIRLINE_STEMS = [
  'аэрофлот', 'ютэйр', 'норд винд', 'нордвинд', 'ред вингс', 'смартавиа', 'азур эйр', 'нордстар', 'ираэро',
  'руслайн', 'уральских авиалини', 'уральские авиалини', 'эмирейтс', 'флайдубай', 'пегасус', 'турецких авиалини',
  'турецкие авиалини', 'катарских авиалини', 'катарские авиалини', 'этихад', 'изиджет', 'райанэйр',
  'люфтганз', 'вьетджет', 'хайнань', 'эйр астан', 'белави', 'центрум эйр', 'узбекистон хаво',
];
// prettier-ignore
const AIRLINE_WORDS = [
  'aeroflot', 'utair', 'nordwind', 'red wings', 'smartavia', 'azur air', 'nordstar', 'iraero', 'rusline',
  'ural airlines', 's7', 'pobeda', 'emirates', 'flydubai', 'pegasus', 'qatar airways', 'etihad', 'easyjet',
  'ryanair', 'wizz air', 'lufthansa', 'klm', 'delta air', 'jetblue', 'southwest', 'vietjet', 'hainan',
  'uzbekistan airways', 'belavia', 'centrum air', 'fly arna', 'flyone', 'qantas', 'cathay', 'iberia',
  'vueling', 'finnair', 'saudia', 'indigo', 'aegean', 'el al', 'aerosvit',
];
// prettier-ignore
const QUOTED_NAMES = [
  'победа', 'россия', 'сибирь', 'азимут', 'аврора', 'ямал', 'якутия', 'алроса', 'северный ветер',
  'ювт аэро', 'ижавиа', 'руслайн', 'ираэро', 'нордстар', 'победы', 'россии', 'сибири', 'азимута', 'авроры',
];

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const AIRLINE_PATTERNS = [
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${AIRLINE_STEMS.map(escape).join('|')})`, 'iu'),
  new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${AIRLINE_WORDS.map(escape).join('|')})(?![\\p{L}\\p{N}])`,
    'iu',
  ),
  new RegExp(`[«"„](?:${QUOTED_NAMES.map(escape).join('|')})[»"“]`, 'iu'),
  // «авиакомпания «Победа»», «авиакомпании S7» — имя в кавычках или латиницей.
  /авиакомпани\p{L}*\s+(?:[«"„]|[A-Z])/u,
  // «Air Canada», «Turkish Airlines», «Uzbekistan Airways».
  /\b(?:Air\s[A-Z][a-z]+|[A-Z][A-Za-z]+\s(?:Airlines|Airways|Air Lines))\b/,
  // «рейс SU 1234», «рейсом DP-405» — номер рейса с кодом настоящей авиакомпании.
  /рейс\p{L}*\s+(?:№\s*)?[A-Z0-9]{2}\s?-?\d{2,4}\b/u,
];

export function mentionsRealAirline(text: string): boolean {
  return AIRLINE_PATTERNS.some((pattern) => pattern.test(text));
}

/** Автоматические теги по словарю ключевых слов: слово — с начала, окончание любое. */
// prettier-ignore
const TAG_DICTIONARY: Array<[string, string[]]> = [
  ['аэропорты', ['аэропорт', 'терминал', 'взлётн', 'взлетн', 'впп']],
  ['расписание', ['расписани', 'новый рейс', 'новые рейсы', 'прямые рейсы', 'прямой рейс', 'возобнов']],
  ['багаж', ['багаж', 'ручн клад', 'ручную кладь', 'ручной клади']],
  ['визы', ['виза', 'визы', 'визу', 'визов', 'безвиз', 'шенген']],
  ['цены', ['цены', 'цена', 'подорож', 'подешев', 'тариф', 'стоимост']],
  ['туризм', ['туризм', 'турист', 'туропер', 'отдых', 'путешеств']],
  ['курорты', ['курорт', 'пляж', 'отел', 'гостиниц']],
  ['безопасность', ['безопасн', 'инцидент', 'авари', 'экстренн', 'аварийн']],
  ['самолёты', ['самолёт', 'самолет', 'лайнер', 'airbus', 'boeing', 'суперджет', 'мс-21', 'ms-21']],
];
const TAG_PATTERNS = TAG_DICTIONARY.map(
  ([tag, stems]) =>
    [tag, new RegExp(`(?<![\\p{L}\\p{N}])(?:${stems.map(escape).join('|')})`, 'iu')] as const,
);

export function autoTags(text: string): string[] {
  return TAG_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

/** Короткий устойчивый хэш ссылки (FNV-1a) — для адреса новости `ext-…`. */
export function linkHash(link: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < link.length; i++) {
    hash ^= link.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

/** Записи ленты → новости отрасли: отбор, очистка, теги. `seen` — ссылки, уже взятые в этот раз. */
export function prepareIndustryNews(
  feed: ExternalFeed,
  items: FeedItem[],
  now: Date,
  seen: Set<string> = new Set(),
): PrepareReport {
  const skipped = { invalid: 0, old: 0, airline: 0, duplicate: 0 };
  const drafts: IndustryNewsDraft[] = [];
  const oldest = now.getTime() - INDUSTRY_MAX_AGE_DAYS * 86_400_000;

  for (const item of items.slice(0, ITEMS_PER_FEED)) {
    const title = htmlToText(item.title);
    const link = normalizeLink(item.link);
    if (!title || !link) {
      skipped.invalid++;
      continue;
    }
    if (seen.has(link)) {
      skipped.duplicate++;
      continue;
    }
    // Дата из будущего — ошибка часов источника: считаем, что новость вышла сейчас.
    const publishedAt =
      item.publishedAt && item.publishedAt.getTime() <= now.getTime() ? item.publishedAt : now;
    if (publishedAt.getTime() < oldest) {
      skipped.old++;
      continue;
    }
    const summary = summarize(htmlToText(item.description));
    if (mentionsRealAirline(`${title} ${summary}`)) {
      skipped.airline++;
      continue;
    }
    seen.add(link);
    drafts.push({
      slug: `ext-${feed.id}-${linkHash(link)}`,
      title: summarize(title, 200),
      summary,
      category: feed.category,
      tags: autoTags(`${title} ${summary}`),
      externalUrl: link,
      externalFeed: feed.id,
      publishedAt,
    });
  }
  return { drafts, skipped };
}

import { z } from 'zod';

export const SEARCH_KINDS = { page: 'Страницы', news: 'Новости', forum: 'Форум' } as const;
export type SearchKind = keyof typeof SEARCH_KINDS;

export const SEARCH_PAGE_SIZE = 10;

/** Документ для индекса — его собирает модуль-владелец (новости, форум) или сид. */
export type SearchDocumentInput = {
  kind: SearchKind;
  refId: string;
  url: string;
  title: string;
  body: string;
  visibleFrom: Date | null;
};

/**
 * Разобранный запрос: группы, соединённые ИЛИ. В группе — слова и фразы, которые должны
 * быть все (И), и слова, которых быть не должно (НЕ).
 */
export type ParsedQuery = Array<{ include: string[]; exclude: string[] }>;

export type SearchHit = {
  id: number;
  kind: SearchKind;
  url: string;
  /** Заголовок и отрывок с отмеченными найденными словами (см. HIGHLIGHT). */
  title: string;
  snippet: string;
};

/** Подсказка под строкой поиска: страница, новость или тема форума, куда можно сразу перейти. */
export type SearchSuggestion = { kind: SearchKind; url: string; title: string };

/** Сколько подсказок показывать: больше в выпадающем списке уже не читают. */
export const SUGGEST_LIMIT = 7;

/** За сколько последних дней считать посещения, чтобы поднять востребованные подсказки выше. */
export const SUGGEST_POPULAR_DAYS = 30;

export type SearchResults = {
  hits: SearchHit[];
  counts: Record<SearchKind | 'all', number>;
  page: number;
  totalPages: number;
};

/** Метки найденных слов в заголовке и отрывке: служебные символы, которых нет в текстах сайта. */
export const HIGHLIGHT = { start: '\u0002', stop: '\u0003' } as const;

const AND = new Set(['и', 'and', '&', '&&']);
const OR = new Set(['или', 'or', '|', '||']);
const NOT = new Set(['не', 'not']);

const MAX_TERMS = 20;

/** Нижний регистр, «ё» как «е». */
export function normalizeText(text: string): string {
  return text.toLowerCase().replaceAll('ё', 'е');
}

/** Только буквы, цифры и дефис внутри слова — остальное для поиска не нужно. */
function cleanWord(word: string): string {
  return word
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Разбор запроса посетителя (L1-S05). Слова через пробел или «И» — все сразу; «ИЛИ» — любое
 * из соседних; «НЕ» или минус перед словом — без него; фраза в кавычках — именно так.
 * Операторы понимаются и по-английски (AND, OR, NOT). Группы, где нечего искать (только «НЕ»),
 * отбрасываются.
 */
export function parseQuery(text: string): ParsedQuery {
  const groups: ParsedQuery = [{ include: [], exclude: [] }];
  let negate = false;
  let terms = 0;

  for (const match of normalizeText(text).matchAll(/"([^"]*)"?|(\S+)/g)) {
    if (terms >= MAX_TERMS) break;
    const [, phrase, token = ''] = match;
    const group = groups.at(-1) as ParsedQuery[number];

    if (phrase === undefined) {
      if (AND.has(token)) continue;
      if (OR.has(token)) {
        if (group.include.length > 0 || group.exclude.length > 0) {
          groups.push({ include: [], exclude: [] });
        }
        negate = false;
        continue;
      }
      if (NOT.has(token)) {
        negate = true;
        continue;
      }
    }

    const minus = phrase === undefined && token.startsWith('-');
    const term = (phrase ?? token).split(/\s+/).map(cleanWord).filter(Boolean).join(' ');
    if (!term) continue;
    (negate || minus ? group.exclude : group.include).push(term);
    negate = false;
    terms++;
  }

  return groups.filter((group) => group.include.length > 0);
}

/**
 * Текст запроса, который можно сравнить с заголовком целиком: одна группа без «НЕ».
 * По нему раздел «Направления» встаёт первым на запрос «направление» (docs/02-product.md).
 */
export function exactTitleText(parsed: ParsedQuery): string | null {
  const [group, ...rest] = parsed;
  if (!group || rest.length > 0 || group.exclude.length > 0) return null;
  return group.include.join(' ');
}

/**
 * Слова для подсказок: только буквы и цифры, не больше 5 слов. Операторов в подсказках нет —
 * человек ещё печатает. Подсказки — уже с первой буквы, как в поисковиках; null — ни одной
 * буквы или цифры.
 */
export function suggestTerms(text: string): string[] | null {
  const words = (normalizeText(text).match(/[\p{L}\p{N}]+/gu) ?? [])
    .slice(0, 5)
    .map((word) => word.slice(0, 50));
  return words.length > 0 ? words : null;
}

/**
 * Запрос по началу слов для `to_tsquery('simple', …)`: «авиа комп» → «авиа:* & комп:*».
 * Словарь simple не обрезает слова до основы: русский превратил бы «авиа» в «ав».
 * В словах только буквы и цифры (suggestTerms), поэтому строка безопасна для to_tsquery.
 */
export function toPrefixQuery(words: string[]): string {
  return words.map((word) => `${word}:*`).join(' & ');
}

const quote = (term: string) => (term.includes(' ') ? `"${term}"` : term);

/**
 * Запрос для `websearch_to_tsquery` PostgreSQL: она сама приводит слова к начальной форме
 * и никогда не падает на странном вводе. Минус — «без», `or` — «или», пробел — «и».
 */
export function toWebSearch(parsed: ParsedQuery): string {
  return parsed
    .map((group) =>
      [...group.include.map(quote), ...group.exclude.map((term) => `-${quote(term)}`)].join(' '),
    )
    .join(' or ');
}

/** Как сайт понял запрос: «багаж И калининград, без «сочи» ИЛИ ереван». */
export function describeQuery(parsed: ParsedQuery): string {
  return parsed
    .map((group) => {
      const include = group.include.map((term) => `«${term}»`).join(' И ');
      const exclude = group.exclude.map((term) => `«${term}»`).join(', ');
      return exclude ? `${include}, без ${exclude}` : include;
    })
    .join(' ИЛИ ');
}

/** Текст с метками HIGHLIGHT → куски для вывода: найденные слова отмечаются <mark>. */
export function splitHighlights(text: string): Array<{ text: string; mark: boolean }> {
  const parts: Array<{ text: string; mark: boolean }> = [];
  for (const [i, piece] of text.split(HIGHLIGHT.start).entries()) {
    if (i === 0) {
      if (piece) parts.push({ text: piece, mark: false });
      continue;
    }
    const [marked = '', ...rest] = piece.split(HIGHLIGHT.stop);
    if (marked) parts.push({ text: marked, mark: true });
    const tail = rest.join('');
    if (tail) parts.push({ text: tail, mark: false });
  }
  return parts;
}

export const searchKindSchema = z.enum(['page', 'news', 'forum']).optional().catch(undefined);

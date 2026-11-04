/**
 * Меню вкладки «RSS» (лаба 4): разделы названы так, чтобы преподаватель сразу нашёл ввод
 * новостей сайта, ввод RSS-ленты, поиск и объединённые новости в одном месте.
 */
export const RSS_VIEWS = {
  merged: 'Объединённые новости',
  input: 'Ввод новостей сайта',
  feeds: 'Подключить RSS-ленту',
  search: 'Поиск по новостям',
  export: 'Выгрузка и подписка',
  upload: 'Разбор RSS-файла',
} as const;
export type RssView = keyof typeof RSS_VIEWS;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const filled = (value: unknown) => {
  const text = first(value);
  return typeof text === 'string' && text.trim() !== '';
};

/**
 * Раздел по адресу. Без `view` — по параметрам старых ссылок: адрес ленты (`feed`) —
 * объединённые новости, условия поиска (`q`, `source`, `sort`, `page`) — поиск; иначе —
 * объединённые новости, они открываются первыми.
 */
export function rssViewOf(params: Record<string, unknown>): RssView {
  const view = first(params.view);
  if (typeof view === 'string' && view in RSS_VIEWS) return view as RssView;
  if (filled(params.feed)) return 'merged';
  if (['q', 'source', 'sort', 'page'].some((key) => filled(params[key]))) return 'search';
  return 'merged';
}

/** Адрес раздела: объединённые новости — сама вкладка. */
export const rssViewHref = (view: RssView) => (view === 'merged' ? '/rss' : `/rss?view=${view}`);

/** Объединённые новости с введённой лентой в формате RSS — значок RSS под ними. */
export const mergedRssHref = (feedUrl: string) =>
  `/rss/merged?${new URLSearchParams({ feed: feedUrl })}`;

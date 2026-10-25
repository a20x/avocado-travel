/**
 * Внешние ленты «Новостей отрасли» (L4-05, docs/05-api.md). Формат выбирают чужие сайты:
 * RSS 2.0, RSS 1.0 или Atom. Ленты проверены на доступность из России.
 */
export type ExternalFeed = {
  /** Короткий код — сохраняется в новости как `external_feed`. */
  id: string;
  /** Название источника — показывается у новости. */
  name: string;
  url: string;
  /** Рубрика импортированных новостей. */
  category: IndustryCategory;
};

export const INDUSTRY_CATEGORIES = {
  aviation: 'Авиация',
  travel: 'Туризм',
} as const;
export type IndustryCategory = keyof typeof INDUSTRY_CATEGORIES;

export const EXTERNAL_FEEDS: ExternalFeed[] = [
  {
    id: 'aviation21',
    name: 'Aviation21',
    url: 'https://aviation21.ru/feed/',
    category: 'aviation',
  },
  {
    id: 'tourdom',
    name: 'Турдом',
    url: 'https://www.tourdom.ru/rss/',
    category: 'travel',
  },
  {
    id: 'lenta-travel',
    name: 'Лента.ру — Путешествия',
    url: 'https://lenta.ru/rss/news/travel',
    category: 'travel',
  },
];

export function feedById(id: string | null): ExternalFeed | undefined {
  return EXTERNAL_FEEDS.find((feed) => feed.id === id);
}

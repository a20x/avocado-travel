/** Дата поиска для проверок: послезавтра — всегда в окне продажи, рейсы ещё не улетели. */
export const SEARCH_DATE = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

/**
 * Публичные страницы сайта (docs/02-product.md). Каждая проверяется на валидность HTML
 * и отсутствие горизонтальной прокрутки. Новая страница — новая строка здесь.
 */
export const PUBLIC_PAGES = [
  '/',
  `/flights?from=moscow&to=kaliningrad&date=${SEARCH_DATE}&passengers=2`,
  '/destinations',
  '/destinations/kaliningrad',
  '/airlines',
  '/news',
  '/news?page=2',
  '/news/avocado-travel-otkrylsya',
  '/guestbook',
  '/forum',
  '/login',
  '/register',
];

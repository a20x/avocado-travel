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
  '/news?source=external',
  '/news/avocado-travel-otkrylsya',
  '/press',
  '/press?sort=title&category=routes',
  '/analytics',
  '/analytics?from=2026-07-01&to=2026-07-31&airline=KRR&destination=sochi',
  '/api/docs',
  '/guestbook',
  '/forum',
  '/services',
  '/services?amount=12500',
  '/weather',
  '/xml',
  '/xml?q=сочи&sort=title&order=asc&cols=title&cols=date',
  '/database',
  '/database?report=routes&airline=KRR',
  '/database?report=airlines',
  '/database?report=months',
  '/database?report=ratings',
  '/rss',
  '/rss?source=site&sort=title',
  '/weather?q=Париж',
  '/weather?city=2988507',
  '/links',
  '/search',
  '/search?q=багаж ИЛИ море',
  '/help',
  '/login',
  '/register',
];

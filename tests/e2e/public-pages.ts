import { PASSENGER_PAGES, passengerPageHref } from '@/modules/passengers';

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
  '/database?report=input',
  '/database?report=about',
  '/database?report=flights',
  '/database?report=routes&airline=KRR',
  '/database?report=schedule',
  '/database?report=airlines',
  '/database?report=months',
  '/database?report=ratings',
  '/rss',
  '/rss?view=input',
  '/rss?view=feeds',
  '/rss?view=search',
  '/rss?view=export',
  '/rss?view=upload',
  '/rss?source=site&sort=title',
  '/rss?feed=ftp%3A%2F%2Fexample.com%2Frss',
  '/weather?q=Париж',
  '/weather?city=2988507',
  '/links',
  '/search',
  '/search?q=багаж ИЛИ море',
  '/help',
  '/passengers',
  ...PASSENGER_PAGES.map((page) => passengerPageHref(page.slug)),
  '/login',
  '/register',
];

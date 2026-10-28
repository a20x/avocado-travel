export type NavItem = {
  href: string;
  label: string;
  /** Дополнительные адреса, на которых пункт тоже считается текущим. */
  alsoActiveOn?: string[];
};

/** Основное меню в шапке (docs/06-design.md). */
export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Рейсы', alsoActiveOn: ['/flights', '/booking'] },
  { href: '/destinations', label: 'Направления' },
  { href: '/news', label: 'Новости' },
  { href: '/services', label: 'Сервисы' },
  // Вкладки лабораторных 2–4 (ADR-0010): преподаватель находит их сразу, без «Ещё».
  { href: '/xml', label: 'XML' },
  { href: '/database', label: 'БД' },
  { href: '/rss', label: 'RSS' },
];

/** Пункты меню «Ещё». */
export const MORE_NAV: NavItem[] = [
  { href: '/airlines', label: 'Авиакомпании' },
  { href: '/weather', label: 'Погода' },
  { href: '/forum', label: 'Форум' },
  { href: '/guestbook', label: 'Гостевая книга' },
  { href: '/press', label: 'Пресс-центр' },
  { href: '/analytics', label: 'Аналитика' },
  { href: '/api/docs', label: 'API и выгрузки' },
  { href: '/links', label: 'Полезные ссылки' },
  { href: '/help', label: 'Справка' },
];

export type ContentsGroup = {
  title: string;
  items: Array<{ href: string; label: string; description: string }>;
};

/**
 * Содержание сайта на главной (L1-08): все разделы с короткими описаниями, по группам.
 * Новый раздел в меню — новая строка и здесь (это проверяет тест).
 */
export const SITE_CONTENTS: ContentsGroup[] = [
  {
    title: 'Билеты',
    items: [
      {
        href: '/destinations',
        label: 'Направления',
        description: 'Города, куда летаем: описание, погода, местное время и рейсы',
      },
      {
        href: '/airlines',
        label: 'Авиакомпании',
        description: 'Маршруты, флот и багаж в тарифе — в одной таблице',
      },
      {
        href: '/account',
        label: 'Личный кабинет',
        description: 'Заказы, коды брони, оплата и отмена',
      },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      {
        href: '/services',
        label: 'Сервисы',
        description: 'Карта маршрутов, мировые часы, календарь и конвертер валют',
      },
      {
        href: '/weather',
        label: 'Погода',
        description: 'Погода в любом городе мира и список «Мои города»',
      },
      {
        href: '/search',
        label: 'Поиск по сайту',
        description: 'По страницам, новостям и форуму, с операторами И, ИЛИ, НЕ',
      },
      {
        href: '/links',
        label: 'Полезные ссылки',
        description: 'Визы, аэропорты, погода и деньги — проверенные сайты',
      },
    ],
  },
  {
    title: 'Общение',
    items: [
      {
        href: '/news',
        label: 'Новости',
        description: 'Новые направления, акции и изменения в сервисе',
      },
      { href: '/forum', label: 'Форум', description: 'Вопросы и советы путешественников' },
      {
        href: '/guestbook',
        label: 'Гостевая книга',
        description: 'Отзывы и пожелания посетителей',
      },
    ],
  },
  {
    title: 'О проекте',
    items: [
      {
        href: '/xml',
        label: 'XML',
        description: 'Пресс-релизы из XML-файла: поиск, сортировка, схема XSD и XSL',
      },
      {
        href: '/database',
        label: 'БД',
        description: 'Паспорт базы и пять видов запросов с графиками и SQL',
      },
      {
        href: '/rss',
        label: 'RSS',
        description: 'RSS-лента, внешние источники и выгрузки в CSV, XML и TXT',
      },
      {
        href: '/press',
        label: 'Пресс-центр',
        description: 'Пресс-релизы с сортировкой и фильтрами',
      },
      { href: '/analytics', label: 'Аналитика', description: 'Отчёты о продажах с графиками' },
      { href: '/api/docs', label: 'API и выгрузки', description: 'Открытые данные для программ' },
      { href: '/help', label: 'Справка', description: 'Ответы на частые вопросы' },
    ],
  },
];

function matches(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Текущий ли это пункт меню для данного адреса. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return [item.href, ...(item.alsoActiveOn ?? [])].some((href) => matches(pathname, href));
}

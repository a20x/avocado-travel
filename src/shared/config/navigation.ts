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
  { href: '/airlines', label: 'Авиакомпании' },
  { href: '/news', label: 'Новости' },
  { href: '/services', label: 'Сервисы' },
];

/** Пункты меню «Ещё». */
export const MORE_NAV: NavItem[] = [
  { href: '/forum', label: 'Форум' },
  { href: '/guestbook', label: 'Гостевая книга' },
  { href: '/press', label: 'Пресс-центр' },
  { href: '/analytics', label: 'Аналитика' },
  { href: '/api/docs', label: 'API и выгрузки' },
  { href: '/links', label: 'Полезные ссылки' },
  { href: '/help', label: 'Справка' },
];

function matches(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Текущий ли это пункт меню для данного адреса. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return [item.href, ...(item.alsoActiveOn ?? [])].some((href) => matches(pathname, href));
}

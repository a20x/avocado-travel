'use client';

// Клиентский компонент: чтобы подсветить текущий пункт, нужен адрес страницы в браузере.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavItemActive, MAIN_NAV, MORE_NAV, type NavItem } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/cn';

function NavLink({
  item,
  pathname,
  className,
}: {
  item: NavItem;
  pathname: string;
  className: string;
}) {
  const isActive = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(className, isActive && 'bg-mist font-semibold')}
    >
      {item.label}
    </Link>
  );
}

const linkClasses =
  'block rounded-sm px-3 py-2 font-medium whitespace-nowrap text-graphite no-underline hover:bg-mist';

/** Основное меню для широкого экрана: пункты и выпадающее «Ещё». */
export function MainNav() {
  const pathname = usePathname();
  const isMoreActive = MORE_NAV.some((item) => isNavItemActive(item, pathname));

  return (
    <nav aria-label="Основное меню" className="hidden flex-1 lg:block">
      <ul className="flex items-center gap-1">
        {MAIN_NAV.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} className={linkClasses} />
          </li>
        ))}
        <li className="relative">
          {/* <details> раскрывается без JavaScript и управляется с клавиатуры. */}
          <details className="group">
            <summary
              className={cn(
                linkClasses,
                'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
                isMoreActive && 'bg-mist font-semibold',
              )}
            >
              Ещё <span aria-hidden="true">▾</span>
            </summary>
            <ul className="absolute top-full right-0 z-20 mt-2 grid w-56 gap-1 rounded-md bg-white p-2 shadow-card">
              {MORE_NAV.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} className={linkClasses} />
                </li>
              ))}
            </ul>
          </details>
        </li>
      </ul>
    </nav>
  );
}

/** Меню для телефона: все пункты одним списком. */
export function MobileNavList() {
  const pathname = usePathname();
  return (
    <nav aria-label="Основное меню (мобильная версия)">
      <ul className="grid gap-1">
        {[...MAIN_NAV, ...MORE_NAV].map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} className={linkClasses} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

'use client';

// Клиентский компонент: чтобы подсветить текущий пункт, нужен адрес страницы в браузере.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { isNavItemActive, MAIN_NAV, MORE_NAV, type NavItem } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/cn';

function NavLink({
  item,
  pathname,
  className,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  className: string;
  onClick?: () => void;
}) {
  const isActive = isNavItemActive(item, pathname);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(className, isActive && 'bg-mist font-semibold')}
    >
      {item.label}
    </Link>
  );
}

/** Сколько ждать, прежде чем закрыть меню, когда мышь ушла: путь до списка не должен его закрывать. */
const CLOSE_DELAY_MS = 200;

/**
 * Выпадающее «Ещё». Основа — <details>: без JavaScript раскрывается щелчком и работает
 * с клавиатуры. С JavaScript — как обычное меню: открывается при наведении мыши,
 * закрывается, когда мышь ушла, по Escape, щелчку мимо и после выбора пункта.
 */
function MoreMenu({ pathname, isActive }: { pathname: string; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Мышь над меню: тогда щелчок по «Ещё» не закрывает уже открытое наведением меню.
  const hovered = useRef(false);

  const cancelClose = () => clearTimeout(closeTimer.current);

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return; // на сенсорном экране наведения нет
    hovered.current = true;
    cancelClose();
    setOpen(true);
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    hovered.current = false;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  // Щелчок мимо меню закрывает его; таймер закрытия не переживает размонтирование.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);
  useEffect(() => cancelClose, []);

  return (
    <details
      ref={root}
      open={open}
      className="group"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          summary.current?.focus();
        }
      }}
    >
      <summary
        ref={summary}
        onClick={(event) => {
          // Открытием управляет состояние, а не браузер: иначе они разойдутся.
          event.preventDefault();
          setOpen((current) => (hovered.current ? true : !current));
        }}
        className={cn(
          linkClasses,
          'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
          isActive && 'bg-mist font-semibold',
        )}
      >
        Ещё <span aria-hidden="true">▾</span>
      </summary>
      {/* Отступ сверху — внутренний (pt-2), а не внешний: между кнопкой и списком нет
          «пустоты», где мышь покидала бы меню. */}
      <div className="absolute top-full right-0 z-20 pt-2">
        <ul className="grid w-56 gap-1 rounded-md bg-white p-2 shadow-card">
          {MORE_NAV.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                pathname={pathname}
                className={linkClasses}
                onClick={() => setOpen(false)}
              />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

const linkClasses =
  'block rounded-sm px-3 py-2 font-medium whitespace-nowrap text-graphite no-underline hover:bg-mist';

/** Основное меню для широкого экрана: пункты и выпадающее «Ещё». */
export function MainNav() {
  const pathname = usePathname();
  const isMoreActive = MORE_NAV.some((item) => isNavItemActive(item, pathname));

  return (
    <nav aria-label="Основное меню" className="order-last hidden basis-full lg:block">
      <ul className="flex items-center gap-1">
        {MAIN_NAV.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} className={linkClasses} />
          </li>
        ))}
        <li className="relative">
          <MoreMenu pathname={pathname} isActive={isMoreActive} />
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

/**
 * Меню телефона и планшета. Основа — <details>: без JavaScript раскрывается кнопкой.
 * С JavaScript ещё и закрывается само: после выбора страницы (шапка при переходе
 * не перерисовывается, и меню оставалось открытым поверх новой страницы), после поиска,
 * по Escape и щелчку мимо.
 */
export function MobileMenu({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (root.current) root.current.open = false;
  };

  // Новая страница — меню закрыто, даже если переход начался не из него.
  useEffect(close, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (root.current?.open && !root.current.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <details
      ref={root}
      className="group lg:hidden"
      onClick={(event) => {
        if ((event.target as Element).closest('a')) close();
      }}
      onSubmit={close}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && root.current?.open) {
          close();
          root.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-sm bg-mist [&::-webkit-details-marker]:hidden"
        aria-label="Меню"
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            className="group-open:hidden"
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            className="hidden group-open:block"
            d="m6 6 12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </summary>
      {children}
    </details>
  );
}

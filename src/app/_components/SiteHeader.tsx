import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/modules/auth/server';
import { SearchBox } from '@/modules/search/ui';
import { cn } from '@/shared/lib/cn';
import { buttonClasses } from '@/shared/ui/Button';
import { MainNav, MobileMenu, MobileNavList } from './MainNav';

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Поиск по сайту: подсказки при вводе, Enter — страница результатов (/search). */
function SiteSearch({ id, name, className }: { id: string; name: string; className?: string }) {
  return (
    // У каждой области (landmark) на странице своё название — так их различает экранный диктор.
    <form action="/search" role="search" aria-label={name} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Поиск по сайту
      </label>
      <div className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-slate focus-within:border-leaf">
        <button type="submit" aria-label="Найти" className="shrink-0 hover:text-graphite">
          <SearchIcon />
        </button>
        <SearchBox id={id} />
      </div>
    </form>
  );
}

/** Вход или, если пользователь уже вошёл, — его раздел: кабинет покупателя или админка. */
function AccountLink({
  href,
  label,
  fullWidth = false,
}: {
  href: string;
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <Link href={href} className={buttonClasses({ variant: 'secondary', fullWidth })}>
      {label}
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const account = !user
    ? { href: '/login', label: 'Войти' }
    : user.role === 'admin'
      ? { href: '/admin', label: 'Админка' }
      : { href: '/account', label: 'Кабинет' };

  return (
    <header className="relative border-b border-line bg-white">
      <div className="container-site flex h-16 items-center gap-6 lg:h-auto lg:flex-wrap lg:gap-y-2 lg:py-3">
        <Link href="/" className="flex-1 lg:flex-none">
          <Image
            src="/images/brand/logo.svg"
            alt="Avocado Travel — на главную"
            width={178}
            height={36}
            priority
          />
        </Link>

        <MainNav />
        <SiteSearch
          id="site-search"
          name="Поиск по сайту"
          className="hidden min-w-56 flex-1 lg:block"
        />
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <AccountLink {...account} />
          {!user && <AccountLink href="/register" label="Регистрация" />}
        </div>

        {/* Меню для телефона и планшета: раскрывается и без JavaScript. */}
        <MobileMenu>
          <div className="absolute inset-x-0 top-16 z-20 grid gap-4 border-b border-line bg-white p-4 shadow-card">
            <SiteSearch id="site-search-mobile" name="Поиск по сайту (мобильное меню)" />
            <MobileNavList />
            <AccountLink {...account} fullWidth />
            {!user && <AccountLink href="/register" label="Регистрация" fullWidth />}
          </div>
        </MobileMenu>
      </div>
    </header>
  );
}

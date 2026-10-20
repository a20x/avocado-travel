import Image from 'next/image';
import Link from 'next/link';
import { buttonClasses } from '@/shared/ui/Button';
import { MainNav, MobileNavList } from './MainNav';

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Поиск по сайту (страница результатов — задача T-25). */
function SiteSearch({ id, name, className }: { id: string; name: string; className?: string }) {
  return (
    // У каждой области (landmark) на странице своё название — так их различает экранный диктор.
    <form action="/search" role="search" aria-label={name} className={className}>
      <label htmlFor={id} className="sr-only">
        Поиск по сайту
      </label>
      <div className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-slate focus-within:border-leaf">
        <button type="submit" aria-label="Найти" className="shrink-0 hover:text-graphite">
          <SearchIcon />
        </button>
        <input
          id={id}
          name="q"
          type="search"
          placeholder="Поиск по сайту"
          className="w-full min-w-0 bg-transparent text-sm text-graphite placeholder:text-slate focus:outline-none"
        />
      </div>
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="relative border-b border-line bg-white">
      <div className="container-site flex h-16 items-center gap-6 lg:h-18">
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
        <SiteSearch id="site-search" name="Поиск по сайту" className="hidden w-56 lg:block" />
        <div className="hidden lg:block">
          <Link href="/login" className={buttonClasses({ variant: 'secondary' })}>
            Войти
          </Link>
        </div>

        {/* Меню для телефона и планшета: раскрывается без JavaScript. */}
        <details className="group lg:hidden">
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
          <div className="absolute inset-x-0 top-16 z-20 grid gap-4 border-b border-line bg-white p-4 shadow-card">
            <SiteSearch id="site-search-mobile" name="Поиск по сайту (мобильное меню)" />
            <MobileNavList />
            <Link
              href="/login"
              className={buttonClasses({ variant: 'secondary', fullWidth: true })}
            >
              Войти
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

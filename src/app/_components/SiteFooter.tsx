import Image from 'next/image';
import Link from 'next/link';
import { MAIN_NAV, MORE_NAV } from '@/shared/config/navigation';

/**
 * Подвал: о сайте, карта сайта, автор и технологии.
 * Курсы ЦБ (T-21) и счётчик посещений (T-19) добавятся сюда из своих модулей.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 bg-graphite py-12 text-sm text-mist">
      <div className="container-site">
        <div className="grid gap-8 md:grid-cols-[1.2fr_2fr]">
          <div className="grid content-start gap-3">
            <Image
              src="/images/brand/logo-light.svg"
              alt="Avocado Travel"
              width={178}
              height={36}
            />
            <p className="max-w-xs text-line-strong">
              Авиабилеты по России и за рубеж. Учебный проект: авиакомпании выдуманные, оплата
              демонстрационная.
            </p>
          </div>
          <nav aria-label="Карта сайта">
            <h2 className="mb-3 text-sm text-white">Карта сайта</h2>
            <ul className="columns-2 gap-8 leading-8 sm:columns-3">
              {[...MAIN_NAV, ...MORE_NAV].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sage no-underline hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-slate pt-4 text-line-strong sm:flex-row sm:justify-between">
          <span>© 2026 Ермаков Александр, Биз-Б23</span>
          <span>Next.js · TypeScript · PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
}

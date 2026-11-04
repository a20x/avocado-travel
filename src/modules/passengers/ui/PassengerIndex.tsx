import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/shared/ui/Card';
import {
  passengerImageSrc,
  passengerPageHref,
  type PassengerGroup,
  type PassengerPage,
} from '../model';

/** Оглавление раздела «Пассажирам»: страницы карточками по группам. */
export function PassengerIndex({
  groups,
}: {
  groups: Array<PassengerGroup & { pages: PassengerPage[] }>;
}) {
  return (
    <div className="grid gap-10">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`} className="grid gap-4">
          <h2 id={`group-${group.id}`} className="text-2xl">
            {group.title}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.pages.map((page) => (
              <li key={page.slug}>
                {/* Вся карточка — ссылка: ::after у ссылки растягивает её на карточку. */}
                <Card className="relative transition-shadow focus-within:ring-3 focus-within:ring-leaf hover:shadow-lg flex h-full items-start gap-4 p-4">
                  <Image
                    src={passengerImageSrc(page.slug)}
                    alt=""
                    width={64}
                    height={48}
                    className="shrink-0"
                  />
                  <div className="grid gap-1">
                    <Link
                      href={passengerPageHref(page.slug)}
                      className="font-semibold outline-none after:absolute after:inset-0"
                    >
                      {page.title}
                    </Link>
                    <span className="text-sm text-slate">{page.description}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

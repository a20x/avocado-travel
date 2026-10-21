import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';
import type { City } from '../cities';

type CityCardProps = {
  city: Pick<City, 'slug' | 'name' | 'image'>;
  /** Строка под названием: «из 2 городов · 21 рейс в неделю». */
  details?: ReactNode;
  /** Плашка справа, обычно цена. */
  badge?: ReactNode;
};

/** Карточка города со ссылкой на страницу направления. */
export function CityCard({ city, details, badge }: CityCardProps) {
  return (
    <Card
      as="article"
      className="relative overflow-hidden transition-shadow focus-within:ring-3 focus-within:ring-leaf hover:shadow-lg"
    >
      {/* Иллюстрация декоративная: город назван в заголовке. */}
      <Image src={city.image} alt="" width={800} height={400} className="h-auto w-full" />
      <div className="flex items-end justify-between gap-3 p-4">
        <div>
          <h3 className="text-lg">
            {/* Ссылка растянута на всю карточку, но в доступном дереве остаётся одна — на названии. */}
            <Link
              href={`/destinations/${city.slug}`}
              className="text-graphite no-underline outline-none after:absolute after:inset-0"
            >
              {city.name}
            </Link>
          </h3>
          {details ? <p className="text-sm text-slate">{details}</p> : null}
        </div>
        {badge}
      </div>
    </Card>
  );
}

import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { SORT_OPTIONS, type SearchQuery, type SortOption } from '../model';
import { searchUrl } from '../search';

const LABELS: Record<SortOption, string> = {
  price: 'дешёвые',
  departure: 'ранние',
  duration: 'быстрые',
};

/** Сортировка — обычные ссылки: работают без JavaScript, порядок виден в адресе. */
export function SortLinks({ query }: { query: SearchQuery }) {
  return (
    <nav aria-label="Сортировка" className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate">Сначала:</span>
      {SORT_OPTIONS.map((sort) => {
        const current = sort === query.sort;
        return (
          <Link
            key={sort}
            href={searchUrl({ ...query, sort })}
            aria-current={current ? 'true' : undefined}
            scroll={false}
            className={cn(
              'rounded-full border px-3.5 py-1 font-medium no-underline',
              current
                ? 'border-graphite bg-graphite text-white'
                : 'border-line bg-white text-graphite hover:border-line-strong',
            )}
          >
            {LABELS[sort]}
          </Link>
        );
      })}
    </nav>
  );
}

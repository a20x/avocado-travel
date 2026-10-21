import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { pageList } from '@/shared/lib/pagination';

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Адрес страницы с номером: страницы — обычные ссылки, их можно открыть и отправить. */
  href: (page: number) => string;
};

const itemClasses =
  'flex h-10 min-w-10 items-center justify-center rounded-sm px-3 font-medium no-underline';

/** Переключатель страниц списка. Одна страница — ничего не показывает. */
export function Pagination({ page, totalPages, href }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Страницы" className="flex flex-wrap items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(itemClasses, 'text-graphite hover:bg-white')}>
          ← Назад
        </Link>
      ) : null}
      {pageList(page, totalPages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-label={`Страница ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              itemClasses,
              item === page ? 'bg-graphite text-white' : 'text-graphite hover:bg-white',
            )}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} className={cn(itemClasses, 'text-graphite hover:bg-white')}>
          Вперёд →
        </Link>
      ) : null}
    </nav>
  );
}

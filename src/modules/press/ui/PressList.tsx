import Link from 'next/link';
import { plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { PressItemView, PressView } from '../model';

function PressItem({ item }: { item: PressItemView }) {
  return (
    // id — якорь релиза: на него ведут результаты поиска по сайту.
    <Card
      as="article"
      id={item.id}
      aria-labelledby={`${item.id}-title`}
      className="grid scroll-mt-4 gap-3 p-5 target:ring-2 target:ring-avocado md:p-6"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
        <Link href={`/press?category=${item.category}`} className="no-underline">
          <Badge>{item.categoryLabel}</Badge>
        </Link>
        <time dateTime={item.date}>{item.dateLabel}</time>
        <span>{item.author}</span>
      </p>
      <h3 id={`${item.id}-title`} className="text-xl">
        {item.title}
      </h3>
      <p className="text-slate">{item.summary}</p>
      <details className="group">
        <summary className="cursor-pointer font-semibold text-leaf">
          <span className="group-open:hidden">Читать полностью</span>
          <span className="hidden group-open:inline">Свернуть</span>
        </summary>
        <div className="mt-3 grid gap-3">
          {item.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </details>
    </Card>
  );
}

/** Список пресс-релизов по готовой модели отображения. */
export function PressList({ view }: { view: PressView }) {
  const shown = view.items.length;
  return (
    <section aria-labelledby="press-results-title" className="grid gap-4">
      <h2 id="press-results-title" className="text-xl">
        {shown === view.total
          ? `${view.total} ${plural(view.total, ['пресс-релиз', 'пресс-релиза', 'пресс-релизов'])}`
          : `Показано ${shown} из ${view.total}`}
      </h2>
      {shown === 0 ? (
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="Таких пресс-релизов нет"
            text="Выберите другую категорию или другого автора."
          />
        </Card>
      ) : (
        view.items.map((item) => <PressItem key={item.id} item={item} />)
      )}
    </section>
  );
}

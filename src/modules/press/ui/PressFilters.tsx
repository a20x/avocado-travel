import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { PRESS_SORTS, type PressSort, type PressView } from '../model';

/**
 * Сортировка и выборка (L2-04) — обычная форма GET: параметры попадают в адрес,
 * выборкой можно поделиться ссылкой, и всё работает без JavaScript.
 */
export function PressFilters({ view }: { view: PressView }) {
  const { query } = view;
  const isDefault = query.sort === 'new' && !query.category && !query.author;
  return (
    <form
      action="/press"
      aria-label="Сортировка и выборка"
      className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
    >
      <Select
        name="sort"
        label="Порядок"
        defaultValue={query.sort}
        options={(Object.keys(PRESS_SORTS) as PressSort[]).map((key) => ({
          value: key,
          label: PRESS_SORTS[key],
        }))}
      />
      <Select
        name="category"
        label="Категория"
        defaultValue={query.category ?? ''}
        options={[
          { value: '', label: 'Все категории' },
          ...view.categories.map((item) => ({
            value: item.value,
            label: `${item.label} (${item.count})`,
          })),
        ]}
      />
      <Select
        name="author"
        label="Автор"
        defaultValue={query.author ?? ''}
        options={[
          { value: '', label: 'Все авторы' },
          ...view.authors.map((item) => ({
            value: item.value,
            label: `${item.label} (${item.count})`,
          })),
        ]}
      />
      <div className="flex items-center gap-4">
        <Button type="submit">Показать</Button>
        {isDefault ? null : <Link href="/press">Сбросить</Link>}
      </div>
    </form>
  );
}

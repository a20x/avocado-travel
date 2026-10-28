import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { PRESS_CATEGORIES, type PressCategory } from '../model';
import { XML_COLUMNS, XML_ORDERS, type XmlColumn, type XmlOrder, type XmlTableView } from '../xml';

/**
 * Поиск, выборка, сортировка и видимые колонки таблицы XML (L2-04) — обычная форма GET:
 * параметры попадают в адрес, и всё работает без JavaScript.
 */
export function XmlFilters({ view }: { view: XmlTableView }) {
  const { query } = view;
  return (
    <form
      action="/xml"
      aria-label="Поиск и сортировка"
      className="grid gap-4 rounded-md bg-white p-5 shadow-card md:p-6"
    >
      <Input
        name="q"
        type="search"
        label="Поиск по всем колонкам"
        defaultValue={query.q}
        maxLength={100}
        placeholder="Текст, дата, категория, автор или код"
      />
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          name="category"
          label="Категория"
          defaultValue={query.category ?? ''}
          options={[
            { value: '', label: 'Все категории' },
            ...(Object.keys(PRESS_CATEGORIES) as PressCategory[]).map((key) => ({
              value: key,
              label: PRESS_CATEGORIES[key],
            })),
          ]}
        />
        <Select
          name="author"
          label="Автор"
          defaultValue={query.author ?? ''}
          options={[
            { value: '', label: 'Все авторы' },
            ...view.authors.map((author) => ({ value: author, label: author })),
          ]}
        />
        <Select
          name="sort"
          label="Сортировать"
          defaultValue={query.sort}
          options={(Object.keys(XML_COLUMNS) as XmlColumn[]).map((key) => ({
            value: key,
            label: XML_COLUMNS[key],
          }))}
        />
        <Select
          name="order"
          label="Порядок"
          defaultValue={query.order}
          options={(Object.keys(XML_ORDERS) as XmlOrder[]).map((key) => ({
            value: key,
            label: XML_ORDERS[key],
          }))}
        />
      </div>
      <fieldset>
        <legend className="mb-2 font-semibold">Колонки</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {(Object.keys(XML_COLUMNS) as XmlColumn[]).map((key) => (
            <label key={key} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                name="cols"
                value={key}
                defaultChecked={view.columns.includes(key)}
                className="size-[18px] shrink-0 accent-leaf"
              />
              {XML_COLUMNS[key]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-4">
        <Button type="submit">Показать</Button>
        <Link href="/xml">Сбросить</Link>
      </div>
    </form>
  );
}

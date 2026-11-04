import Link from 'next/link';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Card } from '@/shared/ui/Card';
import { Table } from '@/shared/ui/Table';
import { XML_COLUMNS, xmlHref, type XmlColumn, type XmlTableView } from '../xml';

/** Ширина колонок с коротким значением: их текст не переносится. */
const NOWRAP: XmlColumn[] = ['id', 'date'];

/** Полный текст релиза — раскрывается в строке таблицы (отдельной страницы релиза нет). */
function FullText({ paragraphs }: { paragraphs: string[] }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-sm font-semibold text-leaf">Читать полностью</summary>
      <div className="mt-2 grid gap-2">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </details>
  );
}

/**
 * Таблица записей XML-файла. Заголовок колонки — ссылка: первый щелчок сортирует по ней,
 * повторный меняет направление. Текущая сортировка отмечена стрелкой и aria-sort. У строки —
 * якорь (`/xml#pr-007`, на него ведут поиск по сайту и старые ссылки «Пресс-центра») и полный
 * текст под «Читать полностью» — в колонке заголовка или, если она скрыта, в первой видимой.
 */
export function XmlTable({ view }: { view: XmlTableView }) {
  const { query, columns, rows } = view;
  const textColumn: XmlColumn | undefined = columns.includes('title') ? 'title' : columns[0];
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          image="/images/illustrations/no-results.svg"
          title="Ничего не нашлось"
          text="Измените запрос или верните «Все категории» и «Все авторы»."
        />
      </Card>
    );
  }
  return (
    <Table caption="Пресс-релизы: семь полей каждой XML-записи">
      <thead>
        <tr>
          {columns.map((column) => {
            const isSorted = query.sort === column;
            const nextOrder = isSorted && query.order === 'asc' ? 'desc' : 'asc';
            return (
              <th
                key={column}
                scope="col"
                aria-sort={isSorted ? (query.order === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <Link
                  href={xmlHref(query, { sort: column, order: isSorted ? nextOrder : 'asc' })}
                  className="text-graphite no-underline hover:underline"
                >
                  {XML_COLUMNS[column]}{' '}
                  <span aria-hidden="true">
                    {isSorted ? (query.order === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </Link>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} id={row.id} className="scroll-mt-24 target:bg-mist">
            {columns.map((column) => (
              <td
                key={column}
                className={NOWRAP.includes(column) ? 'whitespace-nowrap align-top' : 'align-top'}
              >
                {row.cells[column]}
                {column === textColumn ? <FullText paragraphs={row.paragraphs} /> : null}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

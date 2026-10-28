import { getXmlTable } from '@/modules/press/server';
import { XmlFilters, XmlSources, XmlTable } from '@/modules/press/ui';
import { plural } from '@/shared/lib/format';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'XML: пресс-релизы',
  description:
    'Пресс-релизы Avocado Travel из XML-файла: поиск по всем колонкам, выборка, сортировка по любой колонке, схема XSD и преобразование XSL.',
  path: '/xml',
});

/**
 * Вкладка «XML» (лаба 2, ADR-0010): таблица из XML-файла пресс-релизов, его схема XSD
 * и преобразование XSL. Те же записи в JSON — «Пресс-центр» (`/press`).
 */
export default async function XmlPage(props: PageProps<'/xml'>) {
  const view = await getXmlTable(await props.searchParams);

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">Таблица пресс-релизов (XML)</h1>
        <p className="text-slate">
          {view.total} {plural(view.total, ['пресс-релиз', 'пресс-релиза', 'пресс-релизов'])} из
          XML-файла: семь полей у каждой записи. Ищите набор символов во всех колонках, выбирайте по
          категории и автору. Щелчок по заголовку колонки меняет порядок строк.
        </p>
      </header>

      <XmlSources query={view.query} />
      <XmlFilters view={view} />

      <div className="grid gap-3">
        <p role="status">
          Найдено: {view.rows.length} из {view.total}
        </p>
        <XmlTable view={view} />
      </div>
    </div>
  );
}

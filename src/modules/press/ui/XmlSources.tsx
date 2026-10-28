import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PRESS_XML_FILES, xmlHref, type XmlQuery } from '../xml';

/**
 * Исходные файлы вкладки «XML» (L2-06): данные, схема XSD и преобразование XSL. Ссылка
 * «Преобразование XSL» показывает результат с теми же параметрами, что у таблицы.
 */
export function XmlSources({ query }: { query: XmlQuery }) {
  const linkClasses = buttonClasses({ variant: 'secondary' });
  return (
    <Card as="section" aria-labelledby="xml-sources-title" className="grid gap-3 p-5 md:p-6">
      <h2 id="xml-sources-title" className="text-xl">
        Исходные файлы
      </h2>
      <p className="text-slate">
        Таблица формируется из файла{' '}
        <a href={PRESS_XML_FILES.xml}>press-releases.xml — открыть XML</a>. Сервер разбирает его,
        проверяет по схеме и выбирает записи по параметрам адреса. Тот же файл можно превратить в
        HTML-страницу преобразованием XSL — оно тоже ищет, выбирает и сортирует записи.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href={PRESS_XML_FILES.xml} download className={linkClasses}>
          Скачать XML
        </a>
        <a href={xmlHref(query, {}, PRESS_XML_FILES.transform)} className={linkClasses}>
          Преобразование XSL
        </a>
        <a href={PRESS_XML_FILES.xsl} className={linkClasses}>
          Файл XSL
        </a>
        <a href={PRESS_XML_FILES.xsd} className={linkClasses}>
          Схема XSD
        </a>
      </div>
    </Card>
  );
}

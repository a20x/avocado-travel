import { Card } from '@/shared/ui/Card';

/** Откуда данные страницы (L2-06): ссылки на исходный JSON и на его схему. */
export function PressSources() {
  return (
    <Card as="aside" aria-labelledby="press-sources-title" className="grid gap-2 p-5">
      <h2 id="press-sources-title" className="text-lg">
        Данные страницы
      </h2>
      <p className="text-sm text-slate">
        Пресс-релизы хранятся в JSON-файле, его структура описана JSON Schema. Сервер проверяет файл
        по схеме, выбирает и сортирует записи по параметрам адреса и превращает их в HTML.
      </p>
      <ul className="grid gap-1 text-sm">
        <li>
          <a href="/press/press-releases.json">press-releases.json</a> — исходные данные
        </li>
        <li>
          <a href="/press/press-releases.schema.json">press-releases.schema.json</a> — схема данных
        </li>
      </ul>
    </Card>
  );
}

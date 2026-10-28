'use client';

// Клиентский компонент: результат разбора файла приходит ответом формы и показывается здесь же.
import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Table } from '@/shared/ui/Table';
import { previewRssAction, type PreviewState } from '../server/actions';

const published = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

/**
 * Разбор своего RSS-файла (лаба 4): файл делится на записи — заголовок, ссылка, дата,
 * описание — и показывается таблицей. Файл никуда не сохраняется. Работает и без JavaScript.
 */
export function RssUpload() {
  const [state, formAction, pending] = useActionState<PreviewState, FormData>(
    previewRssAction,
    null,
    '/rss',
  );
  return (
    <Card as="section" aria-labelledby="upload-title" className="grid gap-4 p-5 md:p-6">
      <div className="grid gap-1">
        <h2 id="upload-title" className="text-xl">
          Разобрать RSS-файл
        </h2>
        <p className="text-slate">
          Загрузите файл ленты RSS или Atom (до 512 КБ) — например, скачанный выше. Сайт разделит
          его на записи и покажет их таблицей. Файл никуда не сохраняется.
        </p>
      </div>
      <form action={formAction} className="flex flex-wrap items-end gap-4">
        {/* min-w-0 и w-full: у поля выбора файла своя ширина, на телефоне она шире экрана. */}
        <label className="grid min-w-0 gap-1.5">
          <span className="font-medium">Файл ленты</span>
          <input
            type="file"
            name="file"
            accept=".xml,.rss,.atom,application/rss+xml,application/atom+xml,application/xml,text/xml"
            required
            className="w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-2 file:border-graphite file:bg-white file:px-4 file:py-1.5 file:font-semibold"
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Разбираем…' : 'Разобрать'}
        </Button>
      </form>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <div className="grid gap-3">
          <p role="status">
            Файл «{state.preview.name}»: записей — {state.preview.total}
            {state.preview.total > state.preview.items.length
              ? `, показаны первые ${state.preview.items.length}`
              : ''}
            .
          </p>
          {state.preview.items.length > 0 ? (
            <Table caption="Записи загруженного файла">
              <thead>
                <tr>
                  <th scope="col">Дата</th>
                  <th scope="col">Заголовок</th>
                  <th scope="col">Ссылка</th>
                </tr>
              </thead>
              <tbody>
                {state.preview.items.map((item, index) => (
                  <tr key={index}>
                    <td className="text-sm whitespace-nowrap tabular-nums">
                      {item.publishedAt ? published.format(item.publishedAt) : '—'}
                    </td>
                    <td>{item.title || '(без заголовка)'}</td>
                    <td className="text-sm break-all">{item.link || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

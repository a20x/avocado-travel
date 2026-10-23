'use client';

import { useId, useState } from 'react';
import { buttonClasses } from '@/shared/ui/Button';
import { fieldControlClasses } from '@/shared/ui/Field';

type Param = { name: string; in: 'path' | 'query'; required: boolean; example: string };

/** Ответ длиннее этого показываем с обрезкой: схема салона — тысячи строк. */
const MAX_SHOWN = 6000;

/**
 * «Попробовать»: поля параметров с примером, запрос к API прямо со страницы
 * и ответ — статус и JSON. Без JavaScript работает ссылка на пример запроса.
 */
export function TryEndpoint({ path, params }: { path: string; params: Param[] }) {
  const formId = useId();
  const [values, setValues] = useState(() =>
    Object.fromEntries(params.map((param) => [param.name, param.example])),
  );
  const [response, setResponse] = useState<{ status: number; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const url = (() => {
    const filled = path.replace(/\{(\w+)\}/g, (_, name: string) =>
      encodeURIComponent(values[name] ?? ''),
    );
    const query = new URLSearchParams(
      params
        .filter((param) => param.in === 'query' && values[param.name])
        .map((param) => [param.name, values[param.name] ?? '']),
    );
    return `/api/v1${filled}${query.size > 0 ? `?${query}` : ''}`;
  })();

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await fetch(url);
      // Выгрузка CSV — текст, остальное — JSON с отступами.
      const isJson = result.headers.get('content-type')?.includes('json') ?? false;
      const text = isJson
        ? JSON.stringify(await result.json(), null, 2)
        : (await result.text()).replace(/^\uFEFF/, '');
      setResponse({
        status: result.status,
        text: text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}\n… (ответ обрезан)` : text,
      });
    } catch {
      setResponse({ status: 0, text: 'Не удалось выполнить запрос' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={send} className="grid gap-3" aria-label={`Попробовать ${path}`}>
      {params.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {params.map((param) => (
            <div key={param.name} className="grid gap-1">
              <label
                htmlFor={`${formId}-${param.name}`}
                className="font-mono text-sm font-semibold"
              >
                {param.name}
                {param.required ? (
                  <>
                    <span aria-hidden="true"> *</span>
                    <span className="sr-only"> (обязательный)</span>
                  </>
                ) : null}
              </label>
              <input
                id={`${formId}-${param.name}`}
                value={values[param.name] ?? ''}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [param.name]: event.target.value }))
                }
                className={fieldControlClasses}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={buttonClasses({ variant: 'secondary' })}
          disabled={pending}
        >
          {pending ? 'Запрос…' : 'Отправить запрос'}
        </button>
        <code className="min-w-0 text-sm break-all">GET {url}</code>
      </div>
      {response ? (
        <div className="grid gap-1" aria-live="polite">
          <p className="text-sm font-semibold">
            Ответ: {response.status === 0 ? 'нет связи' : response.status}
          </p>
          <pre className="max-h-96 overflow-auto rounded-sm bg-graphite p-4 text-sm text-mist">
            {response.text}
          </pre>
        </div>
      ) : null}
    </form>
  );
}

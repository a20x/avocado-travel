import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { defaultOf, typeLabel } from '../docs';
import { endpointUrl, type ApiEndpoint } from '../endpoints';
import { parametersOf } from '../openapi';
import { TryEndpoint } from './TryEndpoint';

/** Один адрес API: что отдаёт, параметры таблицей, пример запроса и форма «Попробовать». */
export function EndpointDoc({
  endpoint,
  example,
}: {
  endpoint: ApiEndpoint;
  example: { path?: Record<string, string>; query?: Record<string, string> };
}) {
  const parameters = parametersOf(endpoint);
  const exampleUrl = endpointUrl(endpoint, example);
  return (
    <Card
      as="article"
      id={endpoint.id}
      aria-labelledby={`${endpoint.id}-title`}
      className="grid scroll-mt-4 gap-4 p-5 md:p-6"
    >
      <div className="grid gap-2">
        <h3 id={`${endpoint.id}-title`} className="text-xl">
          {endpoint.summary}
        </h3>
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone="success">GET</Badge>
          <code className="font-semibold break-all">/api/v1{endpoint.path}</code>
        </p>
        <p className="text-slate">{endpoint.description}</p>
      </div>

      {parameters.length > 0 ? (
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-slate">
            <caption className="sr-only">Параметры {endpoint.path}</caption>
            <thead>
              <tr>
                <th scope="col">Параметр</th>
                <th scope="col">Тип</th>
                <th scope="col">Описание</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((parameter) => {
                const fallback = defaultOf(parameter);
                return (
                  <tr key={parameter.name}>
                    <td className="font-mono whitespace-nowrap">
                      {parameter.name}
                      {parameter.required ? (
                        <span className="text-error"> обязательный</span>
                      ) : null}
                      {parameter.in === 'path' ? (
                        <span className="block text-xs text-slate">в адресе</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap">{typeLabel(parameter.schema)}</td>
                    <td>
                      {/[.!?]$/.test(parameter.description)
                        ? parameter.description
                        : `${parameter.description}.`}
                      {fallback ? (
                        <span className="text-slate"> По умолчанию: {fallback}.</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate">Без параметров.</p>
      )}

      <p className="text-sm">
        Пример:{' '}
        <a href={exampleUrl} className="font-mono break-all">
          {exampleUrl}
        </a>
      </p>
      <details className="rounded-sm bg-mist p-4">
        <summary className="cursor-pointer font-semibold">Попробовать</summary>
        <div className="mt-3">
          <TryEndpoint
            path={endpoint.path}
            params={parameters.map((parameter) => ({
              name: parameter.name,
              in: parameter.in,
              required: parameter.required,
              example:
                (parameter.in === 'path' ? example.path : example.query)?.[parameter.name] ?? '',
            }))}
          />
        </div>
      </details>
    </Card>
  );
}

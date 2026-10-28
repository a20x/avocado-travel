import { formatSql, type SqlText } from '../model';

const value = (param: unknown) =>
  param instanceof Date
    ? param.toISOString()
    : typeof param === 'string'
      ? `'${param}'`
      : String(param);

/**
 * Текст выполненного запроса (L3-02): SQL, как его получила база, и значения параметров
 * отдельно — так видно, что ввод из формы не попадает в текст SQL.
 */
export function SqlBlock({ queries }: { queries: SqlText[] }) {
  return (
    <details open className="grid gap-2">
      <summary className="cursor-pointer font-semibold text-leaf">
        SQL {queries.length > 1 ? 'этих запросов' : 'этого запроса'}
      </summary>
      <div className="mt-2 grid gap-3">
        {queries.map((query, index) => (
          <div key={index} className="grid gap-1">
            <pre className="overflow-x-auto rounded-sm bg-graphite p-4 text-sm leading-relaxed text-white">
              <code>{formatSql(query.sql)}</code>
            </pre>
            {query.params.length > 0 ? (
              <p className="text-sm text-slate">
                Параметры:{' '}
                {query.params.map((param, i) => `$${i + 1} = ${value(param)}`).join(', ')}
              </p>
            ) : null}
          </div>
        ))}
        <p className="text-sm text-slate">
          Значения из формы передаются базе отдельно от текста SQL (параметры $1, $2…), поэтому ввод
          не может изменить сам запрос. Запрос выполняется на сервере при отправке формы.
        </p>
      </div>
    </details>
  );
}

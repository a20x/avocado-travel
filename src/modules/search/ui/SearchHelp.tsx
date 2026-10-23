/** Подсказка по операторам поиска (L1-S05). */
export function SearchHelp() {
  const rows: Array<[string, string]> = [
    ['багаж калининград', 'оба слова — то же, что «багаж И калининград»'],
    ['сочи ИЛИ стамбул', 'хотя бы одно из слов'],
    ['море НЕ сочи', 'со словом «море», но без «сочи»; можно и так: море -сочи'],
    ['"выбор мест"', 'фраза целиком, слова подряд'],
  ];
  return (
    <details className="rounded-md bg-white p-4 shadow-card">
      <summary className="cursor-pointer font-semibold">Как искать</summary>
      <p className="mt-3 text-sm text-slate">
        Ищутся страницы сайта, новости и обсуждения на форуме. Слова находятся в любой форме: по
        запросу «багажа» найдётся и «багаж». Операторы можно писать и по-английски: AND, OR, NOT.
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
        {rows.map(([example, meaning]) => (
          <div key={example} className="contents">
            <dt className="font-mono font-semibold">{example}</dt>
            <dd className="mb-2 text-slate sm:mb-0">{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

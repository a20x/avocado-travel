import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';

/** Отчёт: номер и заголовок, что считается, сам график и его данные таблицей. */
export function ReportSection({
  id,
  title,
  description,
  children,
  className,
  download,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  /** Адрес выгрузки отчёта в CSV с текущими фильтрами. */
  download?: string;
}) {
  return (
    <Card
      as="section"
      aria-labelledby={`${id}-title`}
      className={`grid content-start gap-4 p-5 md:p-6 ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="grid gap-1">
          <h2 id={`${id}-title`} className="text-xl">
            {title}
          </h2>
          <p className="text-sm text-slate">{description}</p>
        </div>
        {download ? (
          <a href={download} download className="text-sm font-semibold whitespace-nowrap">
            Скачать CSV
          </a>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

/**
 * Данные графика таблицей под спойлером: текстовая замена картинки для экранного диктора,
 * поисковиков и браузера без JavaScript.
 */
export function ChartData({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-leaf">Данные таблицей</summary>
      <div className="relative mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-slate">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((cell) => (
                <th key={cell} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])}>
                {row.map((cell, index) => (
                  <td key={index} className={index > 0 ? 'text-right tabular-nums' : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

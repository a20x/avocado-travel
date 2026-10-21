import type { ReactNode } from 'react';

type TableProps = {
  /** Подпись таблицы — её читает экранный диктор и показывает валидатор. */
  caption: string;
  children: ReactNode;
};

/**
 * Таблица в стиле сайта. На узком экране прокручивается по горизонтали внутри своего блока,
 * а страница целиком вбок не уезжает (docs/06-design.md). Внутрь кладутся <thead> и <tbody>.
 * `relative` — чтобы скрытые подписи (sr-only) внутри таблицы не расширяли страницу.
 */
export function Table({ caption, children }: TableProps) {
  return (
    <div className="relative overflow-x-auto rounded-md bg-white shadow-card">
      <table className="w-full border-collapse text-left [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:bg-mist [&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:text-slate">
        <caption className="px-4 py-3 text-left font-semibold">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

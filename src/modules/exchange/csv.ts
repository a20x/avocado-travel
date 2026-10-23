/**
 * Выгрузки (L4-03): одна таблица — два формата. Столбцы описывают и CSV (подписи для людей,
 * рубли и запятая в дробях — как ждёт Excel в русской локали), и JSON (ключи, копейки, числа).
 */

/** Как показывать значение в CSV: деньги — из копеек в рубли, дробь — с запятой. */
export type ColumnKind = 'text' | 'number' | 'rub' | 'decimal';

export type ExportColumn = {
  key: string;
  label: string;
  kind?: ColumnKind;
  /** Только в JSON — в CSV не нужен человеку (например, время в UTC рядом с местным). */
  jsonOnly?: boolean;
};

export type ExportValue = string | number | boolean | null;
export type ExportTable = { columns: ExportColumn[]; rows: Array<Record<string, ExportValue>> };

/** Разделитель — точка с запятой: так Excel в русской локали сразу раскладывает по столбцам. */
const SEPARATOR = ';';
/** Метка порядка байтов: без неё Excel читает UTF-8 как Windows-1251 и портит кириллицу. */
const BOM = '﻿';

/**
 * Ячейка CSV. Значение с разделителем, кавычками или переносом — в кавычках, кавычки удваиваются.
 * Текст, начинающийся с `=`, `+`, `-` или `@`, Excel принял бы за формулу (CSV injection) —
 * перед ним ставится апостроф.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]|^\s|\s$/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function csvValue(value: ExportValue | undefined, kind: ColumnKind = 'text'): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'да' : 'нет';
  if (typeof value === 'number') {
    if (kind === 'rub') return String(Math.round(value / 100));
    return String(value).replace('.', ',');
  }
  return csvCell(value);
}

/** Таблица в CSV: BOM, строка подписей, строки данных; переводы строк — CRLF, как в RFC 4180. */
export function toCsv(table: ExportTable): string {
  const columns = table.columns.filter((column) => !column.jsonOnly);
  const lines = [
    columns.map((column) => csvCell(column.label)).join(SEPARATOR),
    ...table.rows.map((row) =>
      columns.map((column) => csvValue(row[column.key], column.kind)).join(SEPARATOR),
    ),
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** Таблица в JSON: массив объектов с ключами столбцов, значения — как есть (деньги — копейки). */
export function toJsonRows(table: ExportTable): Array<Record<string, ExportValue>> {
  return table.rows.map((row) =>
    Object.fromEntries(table.columns.map((column) => [column.key, row[column.key] ?? null])),
  );
}

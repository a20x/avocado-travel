'use client';

// Клиентский компонент: при выборе в одном списке остальные сужаются сразу, без отправки формы.
import { useState } from 'react';
import { linkedOptions, type Selection } from '@/shared/lib/linked';
import { Select, type SelectOption } from './Select';

export type LinkedField<K extends string> = {
  name: K;
  label: string;
  /** Первый пункт — «не ограничивать»: «Любой город», «Все авиакомпании». */
  anyLabel: string;
  options: SelectOption[];
};

type LinkedSelectsProps<K extends string> = {
  fields: Array<LinkedField<K>>;
  /** Сочетания значений, для которых есть записи в базе. */
  combos: Array<Record<K, string>>;
  /** Выбор из адреса страницы. */
  initial: Selection<K>;
  /** Сообщает родителю новый выбор — например, чтобы обновить подсказку о датах. */
  onChange?: (selection: Selection<K>) => void;
};

/**
 * Связанные списки: в каждом — только значения, которые вместе с выбранным в остальных дают
 * хотя бы одну запись, поэтому выбрать сочетание без результатов нельзя. Порядок выбора любой.
 * Первая отрисовка идёт на сервере с выбором из адреса — так списки сужены и без JavaScript.
 */
export function LinkedSelects<K extends string>({
  fields,
  combos,
  initial,
  onChange,
}: LinkedSelectsProps<K>) {
  const [selection, setSelection] = useState<Selection<K>>(initial);

  return fields.map((field) => (
    <Select
      key={field.name}
      name={field.name}
      label={field.label}
      value={selection[field.name] ?? ''}
      onChange={(event) => {
        const next = { ...selection, [field.name]: event.target.value };
        setSelection(next);
        onChange?.(next);
      }}
      options={[
        { value: '', label: field.anyLabel },
        // Для обобщённого K TypeScript не упрощает Extract<K, string> до K — подсказываем.
        ...linkedOptions(field.options, combos, selection, field.name as Extract<K, string>),
      ]}
    />
  ));
}

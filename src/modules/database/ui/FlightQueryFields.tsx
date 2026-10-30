'use client';

// Клиентский компонент: подсказка о датах и границы календаря меняются вместе с выбором в списках.
import { useState, type ReactNode } from 'react';
import { mergeDaySpans, weekdaysLabel } from '@/shared/lib/available-days';
import { formatDate } from '@/shared/lib/format';
import { matchingCombos, type Selection } from '@/shared/lib/linked';
import { DatePicker } from '@/shared/ui/DatePicker';
import { LinkedSelects } from '@/shared/ui/LinkedSelects';
import type { SelectOption } from '@/shared/ui/Select';
import type { FlightCombo } from '../model';

type Field = 'from' | 'to' | 'airline';

const day = (date: string) => formatDate(date, { year: true });

/**
 * Поля «Поиска рейсов»: связанные списки «Откуда — Куда — Авиакомпания» (в каждом только то,
 * что сочетается с выбранным в других, — пустого результата из-за списков не бывает) и даты.
 * Календарь ограничен периодом рейсов под выбранные условия, подсказка называет дни недели.
 */
export function FlightQueryFields({
  cities,
  airlines,
  combos,
  initial,
  dateFrom,
  dateTo,
  children,
}: {
  cities: SelectOption[];
  airlines: SelectOption[];
  combos: FlightCombo[];
  initial: Selection<Field>;
  dateFrom?: string;
  dateTo?: string;
  /** Поле между списками и датами — «Сортировка». */
  children: ReactNode;
}) {
  const [selection, setSelection] = useState<Selection<Field>>(initial);
  const span = mergeDaySpans(matchingCombos(combos, selection));

  return (
    <>
      <LinkedSelects
        fields={[
          { name: 'from', label: 'Откуда', anyLabel: 'Любой город', options: cities },
          { name: 'to', label: 'Куда', anyLabel: 'Любой город', options: cities },
          {
            name: 'airline',
            label: 'Авиакомпания',
            anyLabel: 'Все авиакомпании',
            options: airlines,
          },
        ]}
        combos={combos}
        initial={initial}
        onChange={setSelection}
      />
      {children}
      <DatePicker
        name="dateFrom"
        label="Вылет с даты"
        defaultValue={dateFrom ?? ''}
        min={span?.first}
        max={span?.last}
      />
      <DatePicker
        name="dateTo"
        label="По дату включительно"
        defaultValue={dateTo ?? ''}
        min={span?.first}
        max={span?.last}
      />
      <p aria-live="polite" className="text-sm text-slate sm:col-span-2 lg:col-span-3">
        {span
          ? `Рейсы по этим условиям — с ${day(span.first)} по ${day(span.last)}, ${weekdaysLabel(span.weekdays)}.`
          : 'По этим условиям рейсов нет.'}
      </p>
    </>
  );
}

'use client';

// Клиентский компонент: границы календаря и подсказка меняются вместе с выбранной авиакомпанией.
import { useState } from 'react';
import { formatDate } from '@/shared/lib/format';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { salesPeriod, type SalesSpan } from '../model';

const day = (date: string) => formatDate(date, { year: true });

/**
 * Поля сводок продаж: (у «Динамики») авиакомпания и даты. Календарь ограничен периодом, за
 * который есть продажи — по выбранной авиакомпании или по всем, — подсказка называет его.
 */
export function SalesQueryFields({
  spans,
  airlines,
  airline,
  dateFrom,
  dateTo,
}: {
  spans: SalesSpan[];
  /** Список авиакомпаний — только у «Динамики продаж»; нет — сводка по всем. */
  airlines?: SelectOption[];
  airline?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [selected, setSelected] = useState(airline ?? '');
  const period = salesPeriod(spans, selected || undefined);

  return (
    <>
      {airlines ? (
        <Select
          name="airline"
          label="Авиакомпания"
          defaultValue={selected}
          onChange={(event) => setSelected(event.target.value)}
          options={[
            { value: '', label: 'Все авиакомпании' },
            // В списке — только авиакомпании с продажами: иначе выбор дал бы пустой результат.
            ...airlines.filter((option) => spans.some((span) => span.airline === option.value)),
          ]}
        />
      ) : null}
      <DatePicker
        name="dateFrom"
        label="Заказы с даты"
        defaultValue={dateFrom ?? ''}
        min={period?.first}
        max={period?.last}
      />
      <DatePicker
        name="dateTo"
        label="По дату включительно"
        defaultValue={dateTo ?? ''}
        min={period?.first}
        max={period?.last}
      />
      <p aria-live="polite" className="text-sm text-slate sm:col-span-2 lg:col-span-3">
        {period
          ? `Продажи есть с ${day(period.first)} по ${day(period.last)} — даты выбираются в этих границах.`
          : 'Продаж пока нет.'}
      </p>
    </>
  );
}

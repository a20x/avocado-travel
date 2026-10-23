import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Select } from '@/shared/ui/Select';
import type { AnalyticsFilter } from '../model';

type Option = { value: string; label: string };

/**
 * Фильтры отчётов — обычная форма GET: параметры в адресе, отчётом можно поделиться
 * ссылкой. Период — по дате оформления заказа; заполняемость — по дате вылета.
 */
export function AnalyticsFilters({
  filter,
  today,
  airlines,
  destinations,
  isDefault,
}: {
  filter: AnalyticsFilter;
  today: string;
  airlines: Option[];
  destinations: Option[];
  isDefault: boolean;
}) {
  return (
    <form
      action="/analytics"
      aria-label="Фильтры отчётов"
      className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <DatePicker name="from" label="С" defaultValue={filter.from} max={today} />
      <DatePicker name="to" label="По" defaultValue={filter.to} max={today} />
      <Select
        name="airline"
        label="Авиакомпания"
        defaultValue={filter.airline ?? ''}
        options={[{ value: '', label: 'Все авиакомпании' }, ...airlines]}
      />
      <Select
        name="destination"
        label="Направление"
        defaultValue={filter.destination ?? ''}
        options={[{ value: '', label: 'Все направления' }, ...destinations]}
      />
      <div className="flex items-center gap-4">
        <Button type="submit">Показать</Button>
        {isDefault ? null : <Link href="/analytics">Сбросить</Link>}
      </div>
    </form>
  );
}

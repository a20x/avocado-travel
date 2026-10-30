import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { DatePicker } from '@/shared/ui/DatePicker';
import { LinkedSelects } from '@/shared/ui/LinkedSelects';
import type { AnalyticsFilter, SalesPair } from '../model';

type Option = { value: string; label: string };

/**
 * Фильтры отчётов — обычная форма GET: параметры в адресе, отчётом можно поделиться
 * ссылкой. Период — по дате оформления заказа; заполняемость — по дате вылета.
 * «Авиакомпания» и «Направление» связаны: в них только сочетания, по которым были продажи.
 */
export function AnalyticsFilters({
  filter,
  today,
  airlines,
  destinations,
  pairs,
  isDefault,
}: {
  filter: AnalyticsFilter;
  today: string;
  airlines: Option[];
  destinations: Option[];
  pairs: SalesPair[];
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
      <LinkedSelects
        fields={[
          {
            name: 'airline',
            label: 'Авиакомпания',
            anyLabel: 'Все авиакомпании',
            options: airlines,
          },
          {
            name: 'destination',
            label: 'Направление',
            anyLabel: 'Все направления',
            options: destinations,
          },
        ]}
        combos={pairs}
        initial={{ airline: filter.airline, destination: filter.destination }}
      />
      <div className="flex items-center gap-4">
        <Button type="submit">Показать</Button>
        {isDefault ? null : <Link href="/analytics">Сбросить</Link>}
      </div>
    </form>
  );
}

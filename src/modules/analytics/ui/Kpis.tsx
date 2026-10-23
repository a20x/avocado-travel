import { formatPrice } from '@/shared/lib/format';
import type { AnalyticsReport } from '../model';

const number = new Intl.NumberFormat('ru-RU');

/** Главные цифры периода (L3-04): COUNT, SUM, AVG, MAX и доля отмен. */
export function Kpis({ totals }: { totals: AnalyticsReport['totals'] }) {
  const items: Array<[string, string]> = [
    ['Выручка', formatPrice(totals.revenue)],
    ['Оплаченных заказов', number.format(totals.orders)],
    ['Продано билетов', number.format(totals.tickets)],
    ['Средний чек', formatPrice(totals.averageCheck)],
    ['Максимальный чек', formatPrice(totals.maxCheck)],
    ['Отменено заказов', `${totals.cancelShare.toLocaleString('ru-RU')}%`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded-md bg-white p-4 shadow-card">
          <dt className="text-sm text-slate">{label}</dt>
          <dd className="text-xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

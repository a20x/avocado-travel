import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { getReport } from '@/modules/stats/server';
import { StatsReportView } from '@/modules/stats/ui';
import { addDays, dateInZone } from '@/shared/lib/time';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';

export const metadata: Metadata = { title: 'Статистика посещений', robots: { index: false } };

const PRESETS = [7, 30, 90];

export default async function AdminStatsPage(props: PageProps<'/admin/stats'>) {
  await requireAdmin('/admin/stats');
  const params = await props.searchParams;
  const report = await getReport({ from: params.from, to: params.to });
  const today = dateInZone(new Date(), 'Europe/Moscow');

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <h1 className="text-3xl">Статистика посещений</h1>

      {/* Обычная форма GET: период — в адресе, отчёт можно обновить и отправить ссылкой. */}
      <Card className="flex flex-wrap items-end gap-4 p-4 md:p-5">
        <form action="/admin/stats" className="flex flex-wrap items-end gap-4">
          <DatePicker name="from" label="С" max={today} defaultValue={report.period.from} />
          <DatePicker name="to" label="По" max={today} defaultValue={report.period.to} />
          <Button type="submit">Показать</Button>
        </form>
        <nav aria-label="Быстрый выбор периода" className="flex flex-wrap gap-x-4 gap-y-2">
          {PRESETS.map((days) => (
            <Link key={days} href={`/admin/stats?from=${addDays(today, -(days - 1))}&to=${today}`}>
              {days} дней
            </Link>
          ))}
        </nav>
      </Card>

      <StatsReportView report={report} />
    </div>
  );
}

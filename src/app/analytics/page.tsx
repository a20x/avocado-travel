import { ctr } from '@/modules/ads';
import { listCampaigns } from '@/modules/ads/server';
import { formatRubCompact } from '@/modules/analytics';
import { getAnalytics, listSalesPairs } from '@/modules/analytics/server';
import {
  AdsSummary,
  AnalyticsFilters,
  ChartData,
  HorizontalBars,
  Kpis,
  ReportSection,
  RevenueLineChart,
  RouteSalesTable,
  SharePie,
} from '@/modules/analytics/ui';
import { listAirlines, listCities } from '@/modules/catalog-data/server';
import { formatDate, formatPrice } from '@/shared/lib/format';
import { pageMetadata } from '@/shared/lib/metadata';
import { dateInZone } from '@/shared/lib/time';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export const metadata = pageMetadata({
  title: 'Аналитика продаж',
  description:
    'Отчёты о продажах Avocado Travel: выручка по месяцам, популярные направления, заполняемость рейсов, структура продаж и итоги по маршрутам.',
  path: '/analytics',
});

const number = new Intl.NumberFormat('ru-RU');
const pct = (value: number) => `${value.toLocaleString('ru-RU')}%`;

/** Выгрузка отчёта в CSV с теми же фильтрами, что на странице (docs/05-api.md). */
function exportHref(report: string, filter: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ format: 'csv' });
  for (const [key, value] of Object.entries(filter)) if (value) params.set(key, value);
  return `/api/v1/export/analytics/${report}?${params}`;
}

export default async function AnalyticsPage(props: PageProps<'/analytics'>) {
  const now = new Date();
  const today = dateInZone(now, 'Europe/Moscow');
  const [params, airlines, cities, campaigns, pairs] = await Promise.all([
    props.searchParams,
    listAirlines(),
    listCities(),
    listCampaigns(),
    listSalesPairs(),
  ]);
  const report = await getAnalytics(params, now);
  const { filter, totals } = report;
  // «Сбросить» — когда в адресе есть хоть один фильтр.
  const isDefault = !params.from && !params.to && !filter.airline && !filter.destination;

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">Аналитика продаж</h1>
        <p className="text-slate">
          Отчёты по заказам за {formatDate(filter.from, { year: true })} —{' '}
          {formatDate(filter.to, { year: true })}. Данные демонстрационные и обезличенные: заказы
          сгенерированы, авиакомпании выдуманные.
        </p>
      </header>

      <AnalyticsFilters
        filter={filter}
        today={today}
        isDefault={isDefault}
        airlines={airlines.map((airline) => ({ value: airline.code, label: airline.name }))}
        destinations={cities.map((city) => ({ value: city.slug, label: city.name }))}
        pairs={pairs}
      />

      {totals.orders === 0 && totals.cancelled === 0 ? (
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="За этот период продаж нет"
            text="Выберите другой период, авиакомпанию или направление."
          />
        </Card>
      ) : (
        <>
          <Kpis totals={totals} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              id="revenue"
              download={exportHref('revenue', filter)}
              className="lg:col-span-2"
              title="1. Выручка по месяцам"
              description="Сумма оплаченных заказов по месяцу оформления. Отменённые заказы не учитываются. Первый и последний месяц периода могут быть неполными."
            >
              <RevenueLineChart data={report.revenueByMonth} />
              <ChartData
                caption="Выручка по месяцам"
                head={['Месяц', 'Заказов', 'Выручка']}
                rows={report.revenueByMonth.map((row) => [
                  row.label,
                  number.format(row.orders),
                  formatPrice(row.revenue),
                ])}
              />
            </ReportSection>

            <ReportSection
              id="destinations"
              download={exportHref('destinations', filter)}
              title="2. Топ-10 направлений"
              description="Города прилёта по числу проданных билетов."
            >
              <HorizontalBars
                unit="tickets"
                data={report.topDestinations.map((row) => ({
                  label: row.label,
                  value: row.tickets,
                }))}
              />
              <ChartData
                caption="Топ-10 направлений"
                head={['Город', 'Билетов']}
                rows={report.topDestinations.map((row) => [row.label, number.format(row.tickets)])}
              />
            </ReportSection>

            <ReportSection
              id="structure"
              download={exportHref('structure', filter)}
              title="4. Структура продаж"
              description="Доли классов обслуживания среди проданных билетов и доля отменённых заказов."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <figure className="grid gap-1">
                  <figcaption className="text-center font-semibold">Классы</figcaption>
                  <SharePie data={report.classShares} />
                </figure>
                <figure className="grid gap-1">
                  <figcaption className="text-center font-semibold">Заказы</figcaption>
                  <SharePie data={report.statusShares} />
                </figure>
              </div>
              <ChartData
                caption="Структура продаж"
                head={['Часть', 'Количество', 'Доля']}
                rows={[...report.classShares, ...report.statusShares].map((share) => [
                  share.key === 'economy' || share.key === 'business'
                    ? `Билеты: ${share.label.toLowerCase()}`
                    : `Заказы: ${share.label.toLowerCase()}`,
                  number.format(share.value),
                  pct(share.percent),
                ])}
              />
            </ReportSection>

            <ReportSection
              id="occupancy"
              download={exportHref('occupancy', filter)}
              className="lg:col-span-2"
              title="3. Заполняемость рейсов"
              description="Доля мест улетевших рейсов периода (по дате вылета), проданных через Avocado Travel. Остальные места авиакомпании продают сами, поэтому проценты небольшие — сравниваются авиакомпании и самолёты между собой."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <figure className="grid gap-2">
                  <figcaption className="font-semibold">По авиакомпаниям</figcaption>
                  <HorizontalBars
                    unit="percent"
                    data={report.occupancyByAirline.map((row) => ({
                      label: row.label,
                      value: row.percent,
                    }))}
                  />
                </figure>
                <figure className="grid gap-2">
                  <figcaption className="font-semibold">По моделям самолётов</figcaption>
                  <HorizontalBars
                    unit="percent"
                    data={report.occupancyByModel.map((row) => ({
                      label: row.label,
                      value: row.percent,
                    }))}
                  />
                </figure>
              </div>
              <ChartData
                caption="Заполняемость рейсов"
                head={['Авиакомпания или самолёт', 'Рейсов', 'Мест', 'Продано', 'Заполняемость']}
                rows={[...report.occupancyByAirline, ...report.occupancyByModel].map((row) => [
                  row.label,
                  number.format(row.flights),
                  number.format(row.seats),
                  number.format(row.sold),
                  pct(row.percent),
                ])}
              />
            </ReportSection>

            <ReportSection
              id="routes"
              download={exportHref('routes', filter)}
              className="lg:col-span-2"
              title="5. Продажи по маршрутам"
              description={`Оплаченные заказы с учётом фильтров: количество, сумма, средний и максимальный чек. Выручка за период — ${formatRubCompact(totals.revenue)}.`}
            >
              <RouteSalesTable routes={report.routes} totals={totals} />
            </ReportSection>

            <ReportSection
              id="ads"
              className="lg:col-span-2"
              title="Реклама"
              description="Показы и клики рекламных кампаний сайта и доля кликов от показов (CTR)."
            >
              <AdsSummary
                campaigns={campaigns.map((campaign) => ({
                  id: campaign.id,
                  title: campaign.title,
                  impressions: campaign.impressions,
                  clicks: campaign.clicks,
                  ctr: ctr(campaign),
                }))}
              />
            </ReportSection>
          </div>
        </>
      )}
    </div>
  );
}

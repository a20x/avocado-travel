import type { AnalyticsReport } from '@/modules/analytics';
import type { FlightRow } from '@/modules/flights';
import type { News } from '@/modules/news';
import { dateInZone, timeInZone } from '@/shared/lib/time';
import type { ExportTable } from './csv';
import type { AnalyticsReportName } from './model';

/** Таблицы выгрузок (docs/05-api.md, «Выгрузки»): данные сервисов → столбцы и строки. */

const local = (at: Date, timeZone: string) =>
  `${dateInZone(at, timeZone)} ${timeInZone(at, timeZone)}`;
const minutesBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 60_000);

/** Расписание: время вылета и прилёта — местное (как на табло), в JSON — ещё и в UTC. */
export function scheduleTable(flights: FlightRow[]): ExportTable {
  return {
    columns: [
      { key: 'number', label: 'Рейс' },
      { key: 'airline', label: 'Авиакомпания' },
      { key: 'origin', label: 'Откуда (IATA)' },
      { key: 'originCity', label: 'Город вылета' },
      { key: 'destination', label: 'Куда (IATA)' },
      { key: 'destinationCity', label: 'Город прилёта' },
      { key: 'departsLocal', label: 'Вылет (местное время)' },
      { key: 'arrivesLocal', label: 'Прилёт (местное время)' },
      { key: 'departsAt', label: 'Вылет (UTC)', jsonOnly: true },
      { key: 'arrivesAt', label: 'Прилёт (UTC)', jsonOnly: true },
      { key: 'durationMinutes', label: 'В пути, мин', kind: 'number' },
      { key: 'aircraft', label: 'Самолёт' },
      { key: 'priceEconomy', label: 'Эконом, ₽', kind: 'rub' },
      { key: 'priceBusiness', label: 'Бизнес, ₽', kind: 'rub' },
    ],
    rows: flights.map((flight) => ({
      number: flight.number,
      airline: flight.airline.name,
      origin: flight.origin.iata,
      originCity: flight.origin.city,
      destination: flight.destination.iata,
      destinationCity: flight.destination.city,
      departsLocal: local(flight.departsAt, flight.origin.timezone),
      arrivesLocal: local(flight.arrivesAt, flight.destination.timezone),
      departsAt: flight.departsAt.toISOString(),
      arrivesAt: flight.arrivesAt.toISOString(),
      durationMinutes: minutesBetween(flight.departsAt, flight.arrivesAt),
      aircraft: `${flight.aircraft.manufacturer} ${flight.aircraft.model}`,
      priceEconomy: flight.priceEconomy,
      priceBusiness: flight.priceBusiness,
    })),
  };
}

/** Новости: дата — по Москве, без полного текста (он есть в API и в ленте). */
export function newsTable(items: News[], siteUrl: string): ExportTable {
  return {
    columns: [
      { key: 'publishedAt', label: 'Опубликовано (по Москве)' },
      { key: 'title', label: 'Заголовок' },
      { key: 'summary', label: 'Кратко' },
      { key: 'category', label: 'Рубрика' },
      { key: 'source', label: 'Источник' },
      { key: 'tags', label: 'Теги' },
      { key: 'url', label: 'Адрес' },
    ],
    rows: items.map((item) => ({
      publishedAt: local(item.publishedAt, 'Europe/Moscow'),
      title: item.title,
      summary: item.summary,
      category: item.category,
      source: item.source === 'site' ? 'сайт' : 'отрасль',
      tags: item.tags.join(', '),
      url: `${siteUrl}/news/${item.slug}`,
    })),
  };
}

const salesColumns = [
  { key: 'orders', label: 'Заказов', kind: 'number' },
  { key: 'tickets', label: 'Билетов', kind: 'number' },
  { key: 'revenue', label: 'Выручка, ₽', kind: 'rub' },
  { key: 'averageCheck', label: 'Средний чек, ₽', kind: 'rub' },
  { key: 'maxCheck', label: 'Максимальный чек, ₽', kind: 'rub' },
] as const;

/** Отчёт аналитики таблицей: те же цифры, что на графике и в «Данных таблицей». */
export function analyticsTable(name: AnalyticsReportName, report: AnalyticsReport): ExportTable {
  switch (name) {
    case 'revenue':
      return {
        columns: [
          { key: 'month', label: 'Месяц' },
          { key: 'orders', label: 'Оплаченных заказов', kind: 'number' },
          { key: 'revenue', label: 'Выручка, ₽', kind: 'rub' },
        ],
        rows: report.revenueByMonth.map(({ month, orders, revenue }) => ({
          month,
          orders,
          revenue,
        })),
      };
    case 'destinations':
      return {
        columns: [
          { key: 'city', label: 'Город прилёта' },
          { key: 'tickets', label: 'Билетов', kind: 'number' },
        ],
        rows: report.topDestinations.map((row) => ({ city: row.label, tickets: row.tickets })),
      };
    case 'occupancy':
      return {
        columns: [
          { key: 'group', label: 'Разрез' },
          { key: 'label', label: 'Авиакомпания или самолёт' },
          { key: 'flights', label: 'Рейсов', kind: 'number' },
          { key: 'seats', label: 'Мест', kind: 'number' },
          { key: 'sold', label: 'Продано', kind: 'number' },
          { key: 'percent', label: 'Заполняемость, %', kind: 'decimal' },
        ],
        rows: [
          ...report.occupancyByAirline.map((row) => ({ group: 'авиакомпания', ...row })),
          ...report.occupancyByModel.map((row) => ({ group: 'самолёт', ...row })),
        ],
      };
    case 'structure':
      return {
        columns: [
          { key: 'group', label: 'Разрез' },
          { key: 'label', label: 'Часть' },
          { key: 'value', label: 'Количество', kind: 'number' },
          { key: 'percent', label: 'Доля, %', kind: 'decimal' },
        ],
        rows: [
          ...report.classShares.map(({ label, value, percent }) => ({
            group: 'билеты по классам',
            label,
            value,
            percent,
          })),
          ...report.statusShares.map(({ label, value, percent }) => ({
            group: 'заказы по статусам',
            label,
            value,
            percent,
          })),
        ],
      };
    case 'routes':
      return {
        columns: [
          { key: 'origin', label: 'Откуда' },
          { key: 'destination', label: 'Куда' },
          ...salesColumns,
        ],
        rows: report.routes.map((row) => ({ ...row })),
      };
  }
}

/** Имя файла выгрузки: `flights-2026-11-14.csv`. */
export function exportFilename(parts: Array<string | undefined>, format: 'csv' | 'json'): string {
  return `${parts.filter(Boolean).join('-')}.${format}`;
}

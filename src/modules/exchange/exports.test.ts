import { describe, expect, it } from 'vitest';
import type { AnalyticsReport } from '@/modules/analytics';
import type { FlightRow } from '@/modules/flights';
import type { News } from '@/modules/news';
import { csvCell, toCsv, toJsonRows, type ExportTable } from './csv';
import { analyticsTable, exportFilename, newsTable, scheduleTable } from './exports';
import { buildFeed } from './feed';

const table: ExportTable = {
  columns: [
    { key: 'name', label: 'Название' },
    { key: 'price', label: 'Цена, ₽', kind: 'rub' },
    { key: 'share', label: 'Доля, %', kind: 'decimal' },
    { key: 'utc', label: 'UTC', jsonOnly: true },
  ],
  rows: [
    { name: 'Москва; Сочи', price: 520050, share: 7.5, utc: 'x' },
    { name: 'Рейс "Кирра"\nвечерний', price: null, share: 0, utc: 'y' },
  ],
};

describe('CSV', () => {
  it('BOM, разделитель «;», подписи первой строкой, CRLF', () => {
    const csv = toCsv(table);
    expect(csv.startsWith('﻿Название;Цена, ₽;Доля, %\r\n')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('значение с разделителем, кавычками или переносом — в кавычках; рубли и запятая в дробях', () => {
    const [, first, second] = toCsv(table).replace('﻿', '').split('\r\n');
    expect(first).toBe('"Москва; Сочи";5201;7,5');
    expect(second).toBe('"Рейс ""Кирра""\nвечерний";;0');
  });

  it('текст, похожий на формулу Excel, обезврежен апострофом', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('-сочи')).toBe("'-сочи");
    expect(csvCell('обычный текст')).toBe('обычный текст');
  });

  it('JSON — все столбцы с ключами, деньги в копейках', () => {
    expect(toJsonRows(table)[0]).toEqual({
      name: 'Москва; Сочи',
      price: 520050,
      share: 7.5,
      utc: 'x',
    });
  });
});

describe('таблицы выгрузок', () => {
  const flight = {
    id: '1',
    number: 'KRR 5012',
    departsAt: new Date('2026-11-14T07:30:00Z'),
    arrivesAt: new Date('2026-11-14T09:55:00Z'),
    priceEconomy: 650000,
    priceBusiness: 1900000,
    airline: { code: 'KRR', name: 'Кирра', logo: '', color: '', baggageIncluded: true },
    aircraft: { manufacturer: 'Boeing', model: '737-800' },
    layout: { businessRows: 2, businessLayout: 'AC-DF', economyRows: 27, economyLayout: 'ABC-DEF' },
    origin: {
      iata: 'VKO',
      name: 'Внуково',
      city: 'Москва',
      citySlug: 'moscow',
      timezone: 'Europe/Moscow',
    },
    destination: {
      iata: 'KGD',
      name: 'Храброво',
      city: 'Калининград',
      citySlug: 'kaliningrad',
      timezone: 'Europe/Kaliningrad',
    },
  } satisfies FlightRow;

  it('расписание: местное время вылета и прилёта, длительность, самолёт', () => {
    const [row] = toJsonRows(scheduleTable([flight]));
    expect(row).toMatchObject({
      number: 'KRR 5012',
      departsLocal: '2026-11-14 10:30',
      arrivesLocal: '2026-11-14 11:55',
      departsAt: '2026-11-14T07:30:00.000Z',
      durationMinutes: 145,
      aircraft: 'Boeing 737-800',
      priceEconomy: 650000,
    });
    expect(toCsv(scheduleTable([flight]))).toContain(';6500;19000\r\n');
  });

  it('новости: дата по Москве, источник словом, абсолютный адрес', () => {
    const item = {
      slug: 'abc',
      title: 'Заголовок',
      summary: 'Кратко',
      category: 'routes',
      source: 'site',
      tags: ['багаж', 'сочи'],
      publishedAt: new Date('2026-10-01T21:30:00Z'),
    } as News;
    expect(toJsonRows(newsTable([item], 'https://example.org'))[0]).toMatchObject({
      publishedAt: '2026-10-02 00:30',
      source: 'сайт',
      tags: 'багаж, сочи',
      url: 'https://example.org/news/abc',
    });
  });

  it('отчёты аналитики: строки и столбцы по каждому отчёту', () => {
    const report = {
      revenueByMonth: [
        { month: '2026-07', label: 'июль 2026', short: 'июль', revenue: 100, orders: 1 },
      ],
      topDestinations: [{ label: 'Сочи', tickets: 5 }],
      occupancyByAirline: [{ label: 'Кирра', flights: 1, seats: 10, sold: 1, percent: 10 }],
      occupancyByModel: [{ label: 'Boeing 737-800', flights: 1, seats: 10, sold: 1, percent: 10 }],
      classShares: [{ key: 'economy', label: 'Эконом', value: 9, percent: 90 }],
      statusShares: [{ key: 'paid', label: 'Оплачены', value: 9, percent: 100 }],
      routes: [],
    } as unknown as AnalyticsReport;
    expect(toJsonRows(analyticsTable('revenue', report))).toEqual([
      { month: '2026-07', orders: 1, revenue: 100 },
    ]);
    expect(analyticsTable('occupancy', report).rows).toHaveLength(2);
    expect(analyticsTable('structure', report).rows.map((row) => row.group)).toEqual([
      'билеты по классам',
      'заказы по статусам',
    ]);
    expect(analyticsTable('routes', report).columns.map((column) => column.key)).toContain(
      'averageCheck',
    );
  });

  it('имя файла — из непустых частей', () => {
    expect(exportFilename(['flights', '2026-11-14', undefined, 'sochi'], 'csv')).toBe(
      'flights-2026-11-14-sochi.csv',
    );
  });
});

describe('лента JSON Feed', () => {
  it('версия 1.1, абсолютные адреса, текст и теги', () => {
    const feed = buildFeed(
      [
        {
          slug: 'abc',
          title: 'Заголовок',
          summary: 'Кратко',
          body: 'Текст',
          category: 'routes',
          tags: ['сочи'],
          publishedAt: new Date('2026-10-01T10:00:00Z'),
          updatedAt: new Date('2026-10-02T10:00:00Z'),
        } as News,
      ],
      'https://example.org',
    );
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(feed.feed_url).toBe('https://example.org/feed.json');
    expect(feed.items[0]).toEqual({
      id: 'https://example.org/news/abc',
      url: 'https://example.org/news/abc',
      title: 'Заголовок',
      summary: 'Кратко',
      content_text: 'Текст',
      date_published: '2026-10-01T10:00:00.000Z',
      date_modified: '2026-10-02T10:00:00.000Z',
      tags: ['routes', 'сочи'],
    });
  });
});

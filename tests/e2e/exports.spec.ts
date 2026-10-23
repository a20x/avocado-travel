import { expect, test } from '@playwright/test';
import { z } from 'zod';
import { scheduleRowSchema } from '@/modules/exchange';
import { SEARCH_DATE } from './public-pages';

test.describe('выгрузки и лента', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'не зависит от экрана');
  });

  test('CSV расписания: файл для Excel — BOM, «;», подписи столбцов', async ({ request }) => {
    const response = await request.get(
      `/api/v1/export/flights?date=${SEARCH_DATE}&from=moscow&to=sochi`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers()['content-disposition']).toBe(
      `attachment; filename="flights-${SEARCH_DATE}-moscow-sochi.csv"`,
    );
    const bytes = await response.body();
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.toString('utf8').replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe(
      'Рейс;Авиакомпания;Откуда (IATA);Город вылета;Куда (IATA);Город прилёта;Вылет (местное время);Прилёт (местное время);В пути, мин;Самолёт;Эконом, ₽;Бизнес, ₽',
    );
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines.slice(1)) expect(line).toContain(';Москва;');
  });

  test('JSON расписания совпадает со схемой, неверная дата — ошибка API', async ({ request }) => {
    const json = await request.get(`/api/v1/export/flights?format=json&date=${SEARCH_DATE}`);
    expect(json.headers()['content-disposition']).toContain(`flights-${SEARCH_DATE}.json`);
    const rows = z.array(scheduleRowSchema).parse(await json.json());
    expect(rows.length).toBeGreaterThan(50);

    const bad = await request.get('/api/v1/export/flights?date=завтра');
    expect(bad.status()).toBe(400);
  });

  test('CSV отчёта аналитики учитывает фильтры', async ({ request }) => {
    const response = await request.get(
      '/api/v1/export/analytics/routes?format=csv&from=2026-07-01&to=2026-07-31&destination=sochi',
    );
    expect(response.headers()['content-disposition']).toContain(
      'analytics-routes-2026-07-01-2026-07-31-sochi.csv',
    );
    const lines = (await response.text()).replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe(
      'Откуда;Куда;Заказов;Билетов;Выручка, ₽;Средний чек, ₽;Максимальный чек, ₽',
    );
    for (const line of lines.slice(1)) expect(line.split(';')[1]).toBe('Сочи');
  });

  test('лента /feed.json — JSON Feed 1.1, ссылка на неё есть в <head>', async ({ request }) => {
    const response = await request.get('/feed.json');
    expect(response.headers()['content-type']).toContain('application/feed+json');
    const feed = z
      .object({
        version: z.literal('https://jsonfeed.org/version/1.1'),
        title: z.string(),
        feed_url: z.url(),
        items: z
          .array(
            z.object({
              id: z.string(),
              url: z.url(),
              title: z.string(),
              content_text: z.string(),
              date_published: z.iso.datetime(),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(await response.json());
    // Запланированная новость в ленту не попадает.
    expect(feed.items.some((item) => item.url.endsWith('/news/novogodnie-kanikuly'))).toBe(false);

    const html = await (await request.get('/forum')).text();
    expect(html).toContain('<link rel="alternate" type="application/feed+json"');
  });
});

test('кнопки «Скачать CSV» на страницах результатов поиска и аналитики', async ({ page }) => {
  await page.goto(`/flights?from=moscow&to=kaliningrad&date=${SEARCH_DATE}`);
  await expect(
    page.getByRole('link', { name: 'Скачать расписание маршрута (CSV)' }),
  ).toHaveAttribute(
    'href',
    `/api/v1/export/flights?format=csv&date=${SEARCH_DATE}&from=moscow&to=kaliningrad`,
  );

  await page.goto('/analytics?airline=KRR');
  const revenue = page.getByRole('region', { name: '1. Выручка по месяцам' });
  await expect(revenue.getByRole('link', { name: 'Скачать CSV' })).toHaveAttribute(
    'href',
    /\/api\/v1\/export\/analytics\/revenue\?format=csv&from=\d{4}-\d{2}-01&to=\d{4}-\d{2}-\d{2}&airline=KRR/,
  );
});

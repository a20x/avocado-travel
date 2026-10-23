import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  API_ENDPOINTS,
  endpointUrl,
  errorSchema,
  listOf,
  flightOfferSchema,
} from '@/modules/exchange';
import { SEARCH_DATE } from './public-pages';

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());

async function getJson(request: APIRequestContext, url: string, status = 200) {
  const response = await request.get(url);
  expect(response.status(), url).toBe(status);
  expect(response.headers()['content-type']).toContain('application/json');
  return (await response.json()) as unknown;
}

test.describe('публичный API', () => {
  // Ответы сервера не зависят от ширины экрана — проверяем один раз.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'не зависит от экрана');
  });

  test('каждый адрес отвечает по своей схеме', async ({ request }) => {
    const search = listOf(flightOfferSchema).parse(
      await getJson(request, `/api/v1/flights?from=moscow&to=kaliningrad&date=${SEARCH_DATE}`),
    );
    const flightId = search.data[0]?.id ?? '';
    expect(flightId).not.toBe('');

    for (const endpoint of API_ENDPOINTS) {
      const base: { path?: Record<string, string>; query?: Record<string, string> } =
        endpoint.id === 'getFlight' ? { path: { id: flightId } } : endpoint.example(today);
      // Выгрузки по умолчанию — CSV; схема описывает их JSON-вариант.
      const example =
        'isExport' in endpoint ? { ...base, query: { ...base.query, format: 'json' } } : base;
      const url = endpointUrl(endpoint, example);
      const parsed = endpoint.response.safeParse(await getJson(request, url));
      expect(parsed.success, `${url}: ${parsed.error?.message}`).toBe(true);
    }
  });

  test('код аэропорта сужает поиск до этого аэропорта, список делится на страницы', async ({
    request,
  }) => {
    const all = listOf(flightOfferSchema).parse(
      await getJson(request, `/api/v1/flights?from=moscow&to=KGD&date=${SEARCH_DATE}`),
    );
    // Аэропорт — из первого найденного рейса: в Москве их три, рейсы есть не из каждого.
    const iata = all.data[0]?.origin.iata ?? '';
    const one = listOf(flightOfferSchema).parse(
      await getJson(request, `/api/v1/flights?from=${iata}&to=KGD&date=${SEARCH_DATE}&pageSize=1`),
    );
    expect(one.data).toHaveLength(1);
    expect(one.data[0]?.origin.iata).toBe(iata);
    expect(one.meta).toMatchObject({ page: 1, pageSize: 1 });
    expect(one.meta.total).toBeLessThanOrEqual(all.meta.total);
    expect(all.data.every((offer) => offer.origin.citySlug === 'moscow')).toBe(true);
  });

  test('ошибки — в формате API с понятным сообщением', async ({ request }) => {
    const cases: Array<[string, number, string]> = [
      [`/api/v1/flights?from=moscow&to=KGD&date=14.11`, 400, 'VALIDATION_ERROR'],
      [`/api/v1/flights?from=XXX&to=KGD&date=${SEARCH_DATE}`, 400, 'UNKNOWN_PLACE'],
      [`/api/v1/flights?from=moscow&to=SVO&date=${SEARCH_DATE}`, 400, 'SAME_CITY'],
      ['/api/v1/news?pageSize=500', 400, 'VALIDATION_ERROR'],
      ['/api/v1/flights/00000000-0000-4000-8000-000000000000', 404, 'NOT_FOUND'],
      ['/api/v1/flights/not-a-flight', 404, 'NOT_FOUND'],
      ['/api/v1/news/no-such-news', 404, 'NOT_FOUND'],
      ['/api/v1/analytics/profit', 404, 'NOT_FOUND'],
      ['/api/v1/no-such-endpoint', 404, 'NOT_FOUND'],
    ];
    for (const [url, status, code] of cases) {
      const body = errorSchema.parse(await getJson(request, url, status));
      expect(body.error.code, url).toBe(code);
      expect(body.error.message.length, url).toBeGreaterThan(0);
    }
    const bad = errorSchema.parse(
      await getJson(request, '/api/v1/flights?from=moscow&to=KGD&date=14.11', 400),
    );
    expect(bad.error.message).toBe('Параметр date: дата в формате ГГГГ-ММ-ДД');
  });

  test('справочники кэшируются, ответы можно читать с других сайтов', async ({ request }) => {
    const response = await request.get('/api/v1/airports');
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['cache-control']).toBe('public, max-age=600');
    const flights = await request.get(`/api/v1/flights?from=moscow&to=KGD&date=${SEARCH_DATE}`);
    expect(flights.headers()['cache-control']).toBe('no-store');
  });

  test('спецификация OpenAPI описывает все адреса', async ({ request }) => {
    const doc = (await getJson(request, '/api/v1/openapi.json')) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths)).toEqual(API_ENDPOINTS.map((endpoint) => endpoint.path));
  });
});

test('документация API: запрос прямо со страницы', async ({ page }) => {
  await page.goto('/api/docs');
  await expect(page.getByRole('heading', { level: 1, name: 'API и выгрузки' })).toBeVisible();

  const airports = page.getByRole('article', { name: 'Аэропорты' });
  await airports.getByText('Попробовать').click();
  await airports.getByRole('button', { name: 'Отправить запрос' }).click();
  await expect(airports.getByText('Ответ: 200')).toBeVisible();
  await expect(airports.locator('pre')).toContainText('"iata": "SVO"');

  const news = page.getByRole('article', { name: 'Новость', exact: true });
  await news.getByText('Попробовать').click();
  await news.getByRole('textbox', { name: /^slug/ }).fill('no-such-news');
  await news.getByRole('button', { name: 'Отправить запрос' }).click();
  await expect(news.getByText('Ответ: 404')).toBeVisible();
});

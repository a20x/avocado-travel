import { describe, expect, it } from 'vitest';
import { defaultOf, typeLabel } from './docs';
import { API_ENDPOINTS, endpointUrl } from './endpoints';
import { flightSearchParamsSchema, newsParamsSchema, paginate, validationMessage } from './model';
import { buildOpenApi, parametersOf } from './openapi';

describe('параметры API', () => {
  it('поиск рейсов: значения по умолчанию и проверка с понятным сообщением', () => {
    expect(
      flightSearchParamsSchema.parse({ from: 'moscow', to: 'KGD', date: '2026-11-14' }),
    ).toMatchObject({ passengers: 1, class: 'economy', sort: 'price', page: 1, pageSize: 20 });

    const bad = flightSearchParamsSchema.safeParse({ from: 'moscow', to: 'KGD', date: '14.11' });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(validationMessage(bad.error)).toBe('Параметр date: дата в формате ГГГГ-ММ-ДД');
    }
    const missing = flightSearchParamsSchema.safeParse({ to: 'KGD', date: '2026-11-14' });
    expect(missing.success).toBe(false);
  });

  it('размер страницы — не больше 100, источник новостей — site или external', () => {
    expect(newsParamsSchema.safeParse({ pageSize: '500' }).success).toBe(false);
    expect(newsParamsSchema.safeParse({ source: 'twitter' }).success).toBe(false);
    expect(newsParamsSchema.parse({ pageSize: '5', source: 'site' })).toMatchObject({
      pageSize: 5,
      source: 'site',
    });
  });

  it('страница списка и meta', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, { page: 2, pageSize: 10 })).toEqual({
      data: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      meta: { page: 2, pageSize: 10, total: 25 },
    });
    expect(paginate(items, { page: 4, pageSize: 10 }).data).toEqual([]);
  });

  it('адрес запроса с параметрами пути и строки запроса', () => {
    expect(endpointUrl({ path: '/news/{slug}' }, { path: { slug: 'abc' } })).toBe(
      '/api/v1/news/abc',
    );
    expect(endpointUrl({ path: '/flights' }, { query: { from: 'moscow', to: '' } })).toBe(
      '/api/v1/flights?from=moscow',
    );
  });
});

describe('спецификация OpenAPI', () => {
  const doc = buildOpenApi(API_ENDPOINTS, 'https://example.org');

  it('описывает все адреса, путь к API — в servers', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths)).toHaveLength(API_ENDPOINTS.length);
    expect(doc.servers[0]?.url).toBe('https://example.org/api/v1');
  });

  it('каждая ссылка $ref ведёт на существующую схему', () => {
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/components\/schemas\/(\w+)"/g)];
    expect(refs.length).toBeGreaterThan(0);
    for (const [, name] of refs) expect(doc.components.schemas).toHaveProperty(name ?? '');
    expect(JSON.stringify(doc)).not.toContain('#/$defs/');
  });

  it('обязательные параметры отмечены, параметры пути — всегда обязательные', () => {
    const search = API_ENDPOINTS.find((endpoint) => endpoint.id === 'searchFlights');
    const params = parametersOf(search ?? {});
    const required = params.filter((param) => param.required).map((param) => param.name);
    expect(required.sort()).toEqual(['date', 'from', 'to']);
    const flight = parametersOf(
      API_ENDPOINTS.find((endpoint) => endpoint.id === 'getFlight') ?? {},
    );
    expect(flight).toMatchObject([{ name: 'id', in: 'path', required: true }]);
  });
});

describe('документация', () => {
  it('тип параметра для людей и значение по умолчанию', () => {
    expect(typeLabel({ type: 'string', format: 'date' })).toBe('дата ГГГГ-ММ-ДД');
    expect(typeLabel({ type: 'string', enum: ['economy', 'business'] })).toBe('economy | business');
    expect(typeLabel({ type: 'integer', minimum: 1, maximum: 100 })).toBe('целое 1–100');
    expect(typeLabel({ type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER })).toBe(
      'целое от 1',
    );
    expect(
      defaultOf({
        name: 'page',
        in: 'query',
        required: false,
        description: '',
        schema: { default: 1 },
      }),
    ).toBe('1');
  });
});

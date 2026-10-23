import { z } from 'zod';
import type { ApiEndpoint } from './endpoints';
import { API_BASE, API_RATE_LIMIT, errorSchema } from './model';

/** Параметр адреса в описании для людей и программ. */
export type ApiParameter = {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  description: string;
  schema: Record<string, unknown>;
};

/** Параметры адреса из Zod-схемы: обязательный — тот, без которого схема не проходит. */
export function parametersOf(endpoint: Pick<ApiEndpoint, 'pathParams' | 'query'>): ApiParameter[] {
  const fromShape = (shape: z.ZodObject | undefined, place: 'path' | 'query') =>
    Object.entries(shape?.shape ?? {}).map(([name, field]): ApiParameter => {
      const schema = field as z.ZodType;
      const { description = '', ...json } = z.toJSONSchema(schema, {
        io: 'input',
        unrepresentable: 'any',
      }) as Record<string, unknown> & { description?: string };
      delete json.$schema;
      return {
        name,
        in: place,
        required: place === 'path' || !schema.safeParse(undefined).success,
        description,
        schema: json,
      };
    });
  return [...fromShape(endpoint.pathParams, 'path'), ...fromShape(endpoint.query, 'query')];
}

/**
 * JSON Schema ответа для OpenAPI. Схемы с `id` (Airport, FlightOffer…) Zod выносит в `$defs`;
 * в спецификации они живут в `components/schemas`, туда же переписываются ссылки.
 */
function responseSchema(schema: z.ZodType, components: Record<string, unknown>) {
  const json = z.toJSONSchema(schema, { io: 'output', unrepresentable: 'any' }) as Record<
    string,
    unknown
  > & { $defs?: Record<string, unknown> };
  const { $defs = {}, ...rest } = json;
  delete rest.$schema;
  const relink = (value: unknown) =>
    JSON.parse(JSON.stringify(value).replaceAll('"#/$defs/', '"#/components/schemas/')) as unknown;
  for (const [name, def] of Object.entries($defs)) components[name] = relink(def);
  return relink(rest);
}

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

/** Спецификация OpenAPI 3.1 публичного API — из тех же описаний, по которым работают маршруты. */
export function buildOpenApi(endpoints: readonly ApiEndpoint[], siteUrl: string) {
  const components: Record<string, unknown> = {};
  components.Error = responseSchema(errorSchema, components);
  const paths: Record<string, Record<string, unknown>> = {};

  for (const endpoint of endpoints) {
    const parameters = parametersOf(endpoint);
    paths[endpoint.path] = {
      get: {
        operationId: endpoint.id,
        tags: [endpoint.tag],
        summary: endpoint.summary,
        description: endpoint.description,
        parameters,
        responses: {
          200: {
            description: endpoint.isExport ? 'Файл выгрузки' : 'Успех',
            content: {
              'application/json': { schema: responseSchema(endpoint.response, components) },
              // CSV: строка подписей и строки данных, разделитель «;», UTF-8 с BOM.
              ...(endpoint.isExport ? { 'text/csv': { schema: { type: 'string' } } } : {}),
            },
          },
          ...(parameters.length > 0 ? { 400: errorResponse('Неверные параметры') } : {}),
          ...(endpoint.pathParams ? { 404: errorResponse('Не найдено') } : {}),
          429: errorResponse(`Больше ${API_RATE_LIMIT.limit} запросов в минуту с одного адреса`),
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Avocado Travel API',
      version: '1.0.0',
      description:
        'Публичный API учебного сайта продажи авиабилетов: справочники, поиск рейсов, новости, статистика и аналитика. Только чтение, без авторизации. Деньги — целые копейки, время — ISO 8601 в UTC. Авиакомпании выдуманные.',
    },
    servers: [{ url: `${siteUrl}${API_BASE}` }],
    paths,
    components: { schemas: components },
  };
}

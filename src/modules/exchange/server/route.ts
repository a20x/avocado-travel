import 'server-only';
import { env } from '@/server/env';
import { takeRateLimit } from '@/server/rate-limit';
import { getClientIp } from '@/server/request';
import { SITE_URL } from '@/shared/config/site';
import { API_ENDPOINTS, endpointById, type ApiEndpointId } from '../endpoints';
import { API_RATE_LIMIT, validationMessage, type ApiErrorCode } from '../model';
import { buildOpenApi } from '../openapi';
import { FEED_SIZE, buildFeed } from '../feed';
import { listLatestNews } from '@/modules/news/server';
import { HANDLERS } from './handlers';

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  SAME_CITY: 400,
  UNKNOWN_PLACE: 400,
  DATE_OUT_OF_RANGE: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Ответ API: JSON, читать можно с любого сайта, кэш — по описанию адреса. */
function json(body: unknown, status = 200, cacheSeconds = 0, extra: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
      ...extra,
    },
  });
}

export function apiError(code: ApiErrorCode, message: string, extra?: HeadersInit): Response {
  return json({ error: { code, message } }, STATUS[code], 0, extra);
}

/**
 * Маршрут API по описанию адреса: ограничение частоты, проверка параметров схемами,
 * вызов обработчика и единый формат ответа и ошибок (docs/05-api.md).
 */
export function apiRoute(id: ApiEndpointId) {
  const endpoint = endpointById(id);
  const handler = HANDLERS[id] as (
    input: { path: unknown; query: unknown },
    now: Date,
  ) => ReturnType<(typeof HANDLERS)[typeof id]>;

  return async (
    request: Request,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
  ): Promise<Response> => {
    const ip = await getClientIp();
    if (!env.RATE_LIMIT_DISABLED && !takeRateLimit(`api:${ip}`, API_RATE_LIMIT)) {
      return apiError('RATE_LIMITED', 'Слишком много запросов. Повторите через минуту.', {
        'Retry-After': String(API_RATE_LIMIT.windowMs / 1000),
      });
    }

    const path = endpoint.pathParams?.safeParse(await context.params) ?? {
      success: true as const,
      data: {},
    };
    if (!path.success) return apiError('NOT_FOUND', validationMessage(path.error));
    const query = endpoint.query?.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    ) ?? {
      success: true as const,
      data: {},
    };
    if (!query.success) return apiError('VALIDATION_ERROR', validationMessage(query.error));

    try {
      const result = await handler({ path: path.data, query: query.data }, new Date());
      if (!result.ok) return apiError(result.code, result.message);
      if ('file' in result) {
        return new Response(result.file.content, {
          headers: {
            'Content-Type': result.file.contentType,
            'Content-Disposition': `attachment; filename="${result.file.filename}"`,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control':
              endpoint.cacheSeconds > 0 ? `public, max-age=${endpoint.cacheSeconds}` : 'no-store',
          },
        });
      }
      return json(result.body, 200, endpoint.cacheSeconds);
    } catch (error) {
      console.error(`API ${endpoint.path}:`, error);
      return apiError('INTERNAL_ERROR', 'Ошибка сервера. Попробуйте позже.');
    }
  };
}

/** `GET /api/v1/openapi.json` — спецификация API. */
export function handleOpenApi(): Response {
  return json(buildOpenApi(API_ENDPOINTS, SITE_URL), 200, 600);
}

/** `GET /feed.json` — лента новостей сайта (JSON Feed 1.1). */
export async function handleFeed(): Promise<Response> {
  const items = await listLatestNews({ source: 'site', limit: FEED_SIZE });
  return new Response(JSON.stringify(buildFeed(items, SITE_URL), null, 2), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=600',
    },
  });
}

/** Неизвестный адрес под `/api/v1` — ошибка в формате API, а не HTML-страница 404. */
export function handleUnknownEndpoint(): Response {
  return apiError('NOT_FOUND', 'Такого адреса в API нет. Список адресов — /api/docs');
}

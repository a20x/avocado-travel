import 'server-only';

type ExternalOptions = {
  /** Сколько секунд Next.js хранит удачный ответ (docs/03-architecture.md, «Рендеринг»). */
  revalidate: number;
  /** Сколько ждать ответа, мс. */
  timeoutMs?: number;
};

/** После сбоя сервис не беспокоим 5 минут: иначе каждая страница ждала бы таймаута заново. */
const BACKOFF_MS = 5 * 60_000;
const failedAt = new Map<string, number>();

/**
 * Ответ внешнего сервиса (курсы ЦБ, погода) или null, если сервис недоступен.
 * Удачные ответы кэширует Next.js, неудачные не кэшируются — но после сбоя адрес
 * какое-то время не запрашивается вовсе, чтобы страницы не тормозили.
 * Тело ответа уже прочитано: таймаут действует и на его чтение, и обрыв посреди тела
 * тоже даёт null, а не ошибку, которая уронила бы страницу.
 */
export async function fetchExternal(
  url: string,
  { revalidate, timeoutMs = 3000 }: ExternalOptions,
): Promise<Response | null> {
  const failed = failedAt.get(url);
  if (failed && Date.now() - failed < BACKOFF_MS) return null;

  try {
    const response = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.arrayBuffer();
    failedAt.delete(url);
    return new Response(body, { status: response.status, headers: response.headers });
  } catch (error) {
    failedAt.set(url, Date.now());
    console.warn(`Внешний сервис недоступен: ${url}`, error);
    return null;
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchExternal } from './external';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Ответ, у которого заголовки пришли, а тело оборвалось — как при таймауте посреди чтения. */
function brokenBodyResponse(): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('<ValCurs>'));
      controller.error(
        new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
      );
    },
  });
  return new Response(body, { status: 200 });
}

describe('fetchExternal', () => {
  it('отдаёт ответ с уже прочитанным телом', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: true })),
    );
    const response = await fetchExternal('https://example.test/ok', { revalidate: 60 });
    expect(await response?.json()).toEqual({ ok: true });
  });

  it('обрыв при чтении тела — null, а не ошибка страницы', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => brokenBodyResponse()),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      fetchExternal('https://example.test/broken', { revalidate: 60 }),
    ).resolves.toBeNull();
  });

  it('после сбоя адрес какое-то время не запрашивается', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fetchExternal('https://example.test/down', { revalidate: 60 });
    await fetchExternal('https://example.test/down', { revalidate: 60 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

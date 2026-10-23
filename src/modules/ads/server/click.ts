import 'server-only';
import { registerClick } from './service';

/**
 * Обработчик `src/app/go/ad/[id]`: засчитывает клик и ведёт на адрес кампании
 * (docs/02-product.md, «Реклама»). Неизвестная кампания — на главную.
 */
export async function handleAdClick(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const target = await registerClick((await params).id);
  const location = new URL(target ?? '/', request.url);
  // 303 — браузер всегда переходит обычным GET; кэшировать переход нельзя, иначе клики потеряются.
  return new Response(null, {
    status: 303,
    headers: { Location: location.toString(), 'Cache-Control': 'no-store' },
  });
}

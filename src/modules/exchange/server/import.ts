import 'server-only';
import { pruneIndustryNews, saveIndustryNews } from '@/modules/news/server';
import { isCronRequest } from '@/server/cron';
import { EXTERNAL_FEEDS, type ExternalFeed } from '../feeds';
import { INDUSTRY_MAX_AGE_DAYS, prepareIndustryNews, type PrepareReport } from '../industry';
import { MAX_FEED_BYTES, decodeFeed, parseFeed } from '../rss';

/** Ленты бывают медленными, но задание не должно висеть: ждём каждую не дольше 15 секунд. */
const FEED_TIMEOUT_MS = 15_000;

export type FeedImportResult = {
  feed: string;
  received: number;
  added: number;
  skipped: PrepareReport['skipped'];
  error?: string;
};

async function downloadFeed(feed: ExternalFeed): Promise<string> {
  const response = await fetch(feed.url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: {
      // Только латиница: в заголовках HTTP кириллица недопустима.
      'User-Agent': 'AvocadoTravel/1.0 (student project; industry news import)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_FEED_BYTES) throw new Error(`лента больше ${MAX_FEED_BYTES} байт`);
  return decodeFeed(bytes, response.headers.get('content-type'));
}

/**
 * Импорт новостей отрасли из всех лент (L4-05, L4-06): скачать, разобрать, отобрать и
 * сохранить новые; старые — удалить. Недоступная или сломанная лента не мешает остальным:
 * предупреждение в лог и дальше.
 */
export async function importIndustryNews(
  now: Date = new Date(),
): Promise<{ feeds: FeedImportResult[]; removed: number }> {
  const seen = new Set<string>();
  const feeds: FeedImportResult[] = [];
  for (const feed of EXTERNAL_FEEDS) {
    try {
      const items = parseFeed(await downloadFeed(feed));
      const report = prepareIndustryNews(feed, items, now, seen);
      const added = await saveIndustryNews(report.drafts);
      feeds.push({ feed: feed.id, received: items.length, added, skipped: report.skipped });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Лента ${feed.name} (${feed.url}) не импортирована: ${message}`);
      feeds.push({
        feed: feed.id,
        received: 0,
        added: 0,
        skipped: { invalid: 0, old: 0, airline: 0, duplicate: 0 },
        error: message,
      });
    }
  }
  const removed = await pruneIndustryNews(
    new Date(now.getTime() - INDUSTRY_MAX_AGE_DAYS * 86_400_000),
  );
  return { feeds, removed };
}

/** `/api/cron/import-feeds`: планировщик хостинга вызывает раз в 6 часов с CRON_SECRET. */
export async function handleImportFeedsCron(request: Request): Promise<Response> {
  if (!isCronRequest(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json(await importIndustryNews());
}

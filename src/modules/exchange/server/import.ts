import 'server-only';
import { lookup } from 'node:dns/promises';
import { pruneIndustryNews, saveIndustryNews } from '@/modules/news/server';
import { isCronRequest } from '@/server/cron';
import { isPrivateAddress, type ExternalFeed } from '../feeds';
import { INDUSTRY_MAX_AGE_DAYS, prepareIndustryNews, type PrepareReport } from '../industry';
import { MAX_FEED_BYTES, decodeFeed, parseFeed, type FeedItem } from '../rss';
import * as repository from './repository';

/** Ленты бывают медленными, но задание не должно висеть: ждём каждую не дольше 15 секунд. */
const FEED_TIMEOUT_MS = 15_000;
/** Переадресаций (http → https, старый адрес → новый) — не больше трёх. */
const MAX_REDIRECTS = 3;

export type FeedImportResult = {
  feed: string;
  received: number;
  added: number;
  skipped: PrepareReport['skipped'];
  error?: string;
};

/**
 * Адрес можно скачивать: http(s) и сервер не во внутренней сети. Проверяется каждый адрес
 * переадресации — иначе внешний сайт мог бы перенаправить запрос внутрь хостинга (SSRF).
 */
async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('адрес не http(s)');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await lookup(host, { all: true });
  if (addresses.length === 0 || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error('адрес во внутренней сети');
  }
}

/** Текст ленты по адресу: с таймаутом, ограничением размера и проверкой переадресаций. */
export async function downloadFeed(address: string): Promise<string> {
  let url = new URL(address);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      headers: {
        // Только латиница: в заголовках HTTP кириллица недопустима.
        'User-Agent': 'AvocadoTravel/1.0 (student project; industry news import)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_FEED_BYTES) throw new Error(`лента больше ${MAX_FEED_BYTES} байт`);
    return decodeFeed(bytes, response.headers.get('content-type'));
  }
  throw new Error('слишком много переадресаций');
}

const NO_SKIPS: PrepareReport['skipped'] = { invalid: 0, old: 0, airline: 0, duplicate: 0 };

/** Импорт одной ленты; итог записывается у ленты — его видно на вкладке «RSS». */
export async function importFeed(
  feed: ExternalFeed,
  now: Date,
  seen: Set<string> = new Set(),
  items?: FeedItem[],
): Promise<FeedImportResult> {
  try {
    const received = items ?? parseFeed(await downloadFeed(feed.url));
    const report = prepareIndustryNews(feed, received, now, seen);
    const added = await saveIndustryNews(report.drafts);
    await repository.updateFeedStatus(feed.id, {
      checkedAt: now,
      lastError: null,
      lastAdded: added,
    });
    return { feed: feed.id, received: received.length, added, skipped: report.skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Лента ${feed.name} (${feed.url}) не импортирована: ${message}`);
    await repository.updateFeedStatus(feed.id, {
      checkedAt: now,
      lastError: message,
      lastAdded: 0,
    });
    return { feed: feed.id, received: 0, added: 0, skipped: NO_SKIPS, error: message };
  }
}

/**
 * Импорт новостей отрасли из всех подключённых лент (L4-05, L4-06): скачать, разобрать,
 * отобрать и сохранить новые; старые — удалить. Недоступная или сломанная лента не мешает
 * остальным: предупреждение в лог и дальше.
 */
export async function importIndustryNews(
  now: Date = new Date(),
): Promise<{ feeds: FeedImportResult[]; removed: number }> {
  const seen = new Set<string>();
  const feeds: FeedImportResult[] = [];
  for (const feed of await repository.findFeeds()) {
    feeds.push(await importFeed(feed, now, seen));
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

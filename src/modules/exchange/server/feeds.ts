import 'server-only';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { listLatestNews, removeIndustryNewsOfFeed, trimIndustryNews } from '@/modules/news/server';
import { SITE_URL } from '@/shared/config/site';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  COMBINED_PAGE_SIZE,
  EXCHANGE_FORMATS,
  EXPORT_LIMIT,
  combinedQuerySchema,
  exportCombined,
  toRss,
  type CombinedNewsItem,
  type CombinedQuery,
  type ExchangeFormat,
  type RssChannel,
} from '../combined';
import { FEED_SIZE } from '../feed';
import {
  INDUSTRY_CATEGORIES,
  MAX_FEEDS,
  feedIdFor,
  feedInputSchema,
  type ExternalFeedStatus,
  type FeedInput,
  type IndustryCategory,
} from '../feeds';
import { industryQuota } from '../industry';
import { parseFeed, type FeedItem } from '../rss';
import { downloadFeed, importFeed, importIndustryNews, type FeedImportResult } from './import';
import * as repository from './repository';

const SITE_NAME = 'Avocado Travel';

/** Рубрика — подписью, а не кодом: «Акции», «Авиация». */
function categoryLabel(category: string): string {
  if (isNewsCategory(category)) return NEWS_CATEGORIES[category];
  return category in INDUSTRY_CATEGORIES
    ? INDUSTRY_CATEGORIES[category as IndustryCategory]
    : category;
}

function toItem(row: repository.CombinedRow): CombinedNewsItem {
  return {
    id: row.isExternal ? (row.externalUrl ?? row.id) : `${SITE_URL}/news/${row.slug}`,
    title: row.title,
    summary: row.summary,
    category: categoryLabel(row.category),
    source: row.isExternal ? (row.feedName ?? 'Внешний источник') : SITE_NAME,
    url: row.isExternal ? (row.externalUrl ?? `${SITE_URL}/news`) : `${SITE_URL}/news/${row.slug}`,
    publishedAt: row.publishedAt,
    isExternal: row.isExternal,
  };
}

export type RssPage = {
  query: CombinedQuery;
  items: CombinedNewsItem[];
  total: number;
  page: number;
  totalPages: number;
  /** Из чего собрана общая лента под поисковый запрос — для счётчиков над списком. */
  composition: { site: number; external: number };
  feeds: ExternalFeedStatus[];
};

/** Вкладка «RSS»: общая лента по параметрам адреса и список подключённых лент. */
export async function getRssPage(
  params: Record<string, unknown>,
  now = new Date(),
): Promise<RssPage> {
  const query = combinedQuerySchema.parse(params);
  const [found, composition, feeds] = await Promise.all([
    repository.findCombinedNews(
      query,
      { limit: COMBINED_PAGE_SIZE, offset: (query.page - 1) * COMBINED_PAGE_SIZE },
      now,
    ),
    repository.countCombinedBySource(query.q, now),
    repository.findFeedStatuses(),
  ]);
  return {
    query,
    items: found.rows.map(toItem),
    total: found.total,
    page: query.page,
    totalPages: Math.max(1, Math.ceil(found.total / COMBINED_PAGE_SIZE)),
    composition,
    feeds,
  };
}

/** Названия лент по коду — подпись источника у новостей отрасли на `/news`. */
export async function getFeedNames(): Promise<Map<string, string>> {
  const feeds = await repository.findFeeds();
  return new Map(feeds.map((feed) => [feed.id, feed.name]));
}

export type AddFeedError = 'INVALID' | 'LIMIT' | 'DUPLICATE' | 'NOT_A_FEED';
/** У ошибки INVALID — текст из схемы: что именно не так в форме. */
export type AddFeedResult =
  { ok: true; data: FeedImportResult } | { ok: false; error: AddFeedError; message?: string };

/**
 * Подключить ленту (администратор, вкладка «RSS»): адрес скачивается и разбирается сразу —
 * подключается только настоящая лента RSS или Atom, и её новости появляются без ожидания.
 */
export async function addFeed(input: unknown, now = new Date()): Promise<AddFeedResult> {
  const parsed = feedInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID', message: parsed.error.issues[0]?.message ?? '' };
  }
  const data: FeedInput = parsed.data;
  const feeds = await repository.findFeeds();
  if (feeds.length >= MAX_FEEDS) return fail('LIMIT');
  if (feeds.some((feed) => feed.url === data.url)) return fail('DUPLICATE');

  let items: FeedItem[];
  try {
    items = parseFeed(await downloadFeed(data.url));
  } catch {
    return fail('NOT_A_FEED');
  }
  const feed = {
    id: feedIdFor(
      data.url,
      feeds.map((item) => item.id),
    ),
    ...data,
  };
  if (!(await repository.insertFeed(feed))) return fail('DUPLICATE');
  // Лент стало больше — доля каждой меньше: новая берёт свою долю, у остальных лишнее удаляется.
  const quota = industryQuota(feeds.length + 1);
  const result = await importFeed(feed, now, quota, new Set(), items);
  await trimIndustryNews(quota);
  return ok(result);
}

/** Отключить ленту: её новости удаляются с сайта вместе с ней. */
export async function removeFeed(id: unknown): Promise<Result<{ removed: number }, 'NOT_FOUND'>> {
  if (typeof id !== 'string' || !(await repository.findFeedById(id))) return fail('NOT_FOUND');
  const removed = await removeIndustryNewsOfFeed(id);
  await repository.deleteFeed(id);
  return ok({ removed });
}

/** Обновить все ленты сейчас, не дожидаясь задания по расписанию. */
export function refreshFeeds(): ReturnType<typeof importIndustryNews> {
  return importIndustryNews();
}

/** Больше этого файл не разбирается: обычная лента весит десятки килобайт. */
export const MAX_UPLOAD_BYTES = 512 * 1024;
/** Сколько записей файла показать: остальные только посчитать. */
export const PREVIEW_ITEMS = 50;

export type RssPreview = { name: string; total: number; items: FeedItem[] };
export type PreviewError = 'NO_FILE' | 'TOO_BIG' | 'NOT_A_FEED';

/**
 * Разбор загруженного RSS-файла (лаба 4: «разделяет его на составные части — элементы»).
 * Файл никуда не сохраняется — посетитель видит, что в нём, и только.
 */
export async function previewRssFile(file: unknown): Promise<Result<RssPreview, PreviewError>> {
  if (!(file instanceof File) || file.size === 0) return fail('NO_FILE');
  if (file.size > MAX_UPLOAD_BYTES) return fail('TOO_BIG');
  try {
    const items = parseFeed(new TextDecoder('utf-8').decode(await file.arrayBuffer()));
    return ok({
      name: file.name.slice(0, 100),
      total: items.length,
      items: items.slice(0, PREVIEW_ITEMS),
    });
  } catch {
    return fail('NOT_A_FEED');
  }
}

/** Канал выгрузки RSS общей ленты. */
const COMBINED_CHANNEL: RssChannel = {
  title: 'Avocado Travel — общая лента новостей',
  link: `${SITE_URL}/rss`,
  description: 'Новости Avocado Travel и подключённых отраслевых изданий.',
  selfUrl: `${SITE_URL}/rss/export?format=rss`,
};

/** `/rss/export?format=…`: общая лента с текущими фильтрами в выбранном формате, файлом. */
export async function handleCombinedExport(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  if (!format || !(format in EXCHANGE_FORMATS)) {
    return new Response('Неизвестный формат. Доступны: csv, xml, rss, txt, wrapped.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const now = new Date();
  const query = combinedQuerySchema.parse(Object.fromEntries(url.searchParams));
  const { rows } = await repository.findCombinedNews(
    query,
    { limit: EXPORT_LIMIT, offset: 0 },
    now,
  );
  const kind = EXCHANGE_FORMATS[format as ExchangeFormat];
  return new Response(
    exportCombined(format as ExchangeFormat, rows.map(toItem), COMBINED_CHANNEL, now),
    {
      headers: {
        'Content-Type': kind.type,
        'Content-Disposition': `attachment; filename="avocado-news-${format}.${kind.extension}"`,
        'Cache-Control': 'no-store',
      },
    },
  );
}

/** `GET /feed.xml` — лента новостей сайта в RSS 2.0 (L4-02), рядом с `/feed.json`. */
export async function handleRssFeed(): Promise<Response> {
  const latest = await listLatestNews({ source: 'site', limit: FEED_SIZE });
  const items: CombinedNewsItem[] = latest.map((item) => ({
    id: `${SITE_URL}/news/${item.slug}`,
    title: item.title,
    summary: item.summary,
    category: categoryLabel(item.category),
    source: SITE_NAME,
    url: `${SITE_URL}/news/${item.slug}`,
    publishedAt: item.publishedAt,
    isExternal: false,
  }));
  const channel: RssChannel = {
    title: 'Новости Avocado Travel',
    link: `${SITE_URL}/news`,
    description: 'Новые направления, акции и изменения в сервисе Avocado Travel.',
    selfUrl: `${SITE_URL}/feed.xml`,
  };
  return new Response(toRss(channel, items, new Date()), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=600',
    },
  });
}

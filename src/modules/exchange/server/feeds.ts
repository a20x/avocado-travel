import 'server-only';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { listLatestNews, removeIndustryNewsOfFeed, trimIndustryNews } from '@/modules/news/server';
import { env } from '@/server/env';
import { takeRateLimit } from '@/server/rate-limit';
import { getClientIp } from '@/server/request';
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
import {
  MERGED_FEED_ITEMS,
  MERGED_SITE_ITEMS,
  feedItemsToNews,
  feedSourceName,
  feedUrlSchema,
  mergeNews,
} from '../merge';
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

export type MergedFeed = {
  url: string;
  source: string;
  items: CombinedNewsItem[];
  /** Сколько в списке записей ленты и новостей сайта. */
  feedCount: number;
  siteCount: number;
  /** Сколько записей в ленте всего и сколько не показано (без ссылки, про настоящие авиакомпании). */
  received: number;
  skipped: number;
};
/** Последние новости сайта для объединённых новостей. */
async function latestSiteNews(now: Date): Promise<CombinedNewsItem[]> {
  const site = await repository.findCombinedNews(
    { q: '', source: 'site', sort: 'new' },
    { limit: MERGED_SITE_ITEMS, offset: 0 },
    now,
  );
  return site.rows.map(toItem);
}

/** Объединённые новости без введённой ленты: сайт и подключённые ленты одной страницей. */
export type MergedPreview = { items: CombinedNewsItem[]; siteCount: number; feedCount: number };

/**
 * Раздел «Объединённые новости», пока адрес ленты не введён: последние новости сайта и
 * подключённых RSS-лент из базы — одним списком по убыванию дат, без деления на страницы
 * (Этап 12). Тот же набор отдаёт значок RSS под ним (`/rss/merged`).
 */
export async function getMergedPreview(now = new Date()): Promise<MergedPreview> {
  const [siteItems, external] = await Promise.all([
    latestSiteNews(now),
    repository.findCombinedNews(
      { q: '', source: 'external', sort: 'new' },
      { limit: MERGED_FEED_ITEMS, offset: 0 },
      now,
    ),
  ]);
  const feedItems = external.rows.map(toItem);
  return {
    items: mergeNews(siteItems, feedItems),
    siteCount: siteItems.length,
    feedCount: feedItems.length,
  };
}

export type MergedFeedError = 'INVALID_URL' | 'NOT_A_FEED' | 'EMPTY' | 'TOO_MANY_REQUESTS';
/** У ошибки INVALID_URL — текст из схемы: что не так с адресом. */
export type MergedFeedResult =
  { ok: true; data: MergedFeed } | { ok: false; error: MergedFeedError; message?: string };

/** Чужой сайт скачивается по каждому запросу — не чаще 10 раз в минуту с одного адреса. */
const MERGE_LIMIT = { limit: 10, windowMs: 60_000 };

/**
 * Объединённые новости по введённому адресу (замечание преподавателя по лабе 4): скачать ленту
 * с защитой от адресов внутренней сети (downloadFeed), разобрать на записи и перемешать
 * с последними новостями сайта. Ничего не сохраняется.
 */
export async function getMergedFeed(rawUrl: unknown, now = new Date()): Promise<MergedFeedResult> {
  const parsed = feedUrlSchema.safeParse(typeof rawUrl === 'string' ? rawUrl : '');
  if (!parsed.success) {
    return { ...fail('INVALID_URL'), message: parsed.error.issues[0]?.message };
  }
  const url = parsed.data;
  const allowed =
    env.RATE_LIMIT_DISABLED || takeRateLimit(`merge:${await getClientIp()}`, MERGE_LIMIT);
  if (!allowed) return fail('TOO_MANY_REQUESTS');

  let received: FeedItem[];
  try {
    received = parseFeed(await downloadFeed(url));
  } catch {
    return fail('NOT_A_FEED');
  }
  const source = feedSourceName(url);
  const report = feedItemsToNews(received, source, now);
  if (report.items.length === 0) return fail('EMPTY');

  const siteItems = await latestSiteNews(now);
  return ok({
    url,
    source,
    items: mergeNews(siteItems, report.items),
    feedCount: report.items.length,
    siteCount: siteItems.length,
    received: received.length,
    skipped: report.skippedInvalid + report.skippedAirline,
  });
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

const MERGED_ERRORS: Record<MergedFeedError, { status: number; text: string }> = {
  INVALID_URL: { status: 400, text: 'Неверный адрес ленты.' },
  NOT_A_FEED: { status: 422, text: 'По этому адресу нет ленты RSS или Atom, или сайт не ответил.' },
  EMPTY: { status: 422, text: 'В ленте нет новостей, которые можно показать.' },
  TOO_MANY_REQUESTS: { status: 429, text: 'Слишком много запросов подряд. Подождите минуту.' },
};

const rssResponse = (channel: RssChannel, items: CombinedNewsItem[]) =>
  new Response(toRss(channel, items, new Date()), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/**
 * `GET /rss/merged?feed=<адрес>` — объединённые новости сайта и введённой ленты в RSS 2.0
 * (значок RSS под объединёнными новостями, замечание преподавателя по лабе 4). Без `feed` —
 * новости сайта и подключённых лент. Тот же набор и порядок (по убыванию дат), что на вкладке;
 * ничего не сохраняется. Открывается в браузере, а не скачивается файлом.
 */
export async function handleMergedRss(request: Request): Promise<Response> {
  const feedUrl = new URL(request.url).searchParams.get('feed')?.trim() ?? '';
  if (!feedUrl) {
    const preview = await getMergedPreview();
    return rssResponse(
      {
        title: 'Avocado Travel: объединённые новости сайта и RSS-лент',
        link: `${SITE_URL}/rss`,
        description: 'Новости сайта Avocado Travel вместе с новостями подключённых RSS-лент.',
        selfUrl: `${SITE_URL}/rss/merged`,
      },
      preview.items,
    );
  }
  const result = await getMergedFeed(feedUrl);
  if (!result.ok) {
    const { status, text } = MERGED_ERRORS[result.error];
    return new Response(result.message ?? text, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const channel: RssChannel = {
    title: `Avocado Travel + ${result.data.source}: объединённые новости`,
    link: `${SITE_URL}/rss?${new URLSearchParams({ feed: result.data.url })}`,
    description: `Новости сайта Avocado Travel вместе с новостями ленты ${result.data.source}.`,
    selfUrl: `${SITE_URL}/rss/merged?${new URLSearchParams({ feed: result.data.url })}`,
  };
  return rssResponse(channel, result.data.items);
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

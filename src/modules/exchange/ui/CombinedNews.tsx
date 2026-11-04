import Link from 'next/link';
import { plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import {
  COMBINED_SORTS,
  EXCHANGE_FORMATS,
  combinedHref,
  type CombinedQuery,
  type CombinedSort,
  type ExchangeFormat,
} from '../combined';
import type { ExternalFeedStatus } from '../feeds';
import { mergedRssHref } from '../rss-tab';
import type { MergedPreview, RssPage } from '../server/feeds';
import { CombinedItem } from './CombinedItem';
import { RssLink } from './RssLink';

/** Выгрузка с теми же фильтрами, что у списка, — без номера страницы: выгружается всё. */
const exportHref = (query: CombinedQuery, format: ExchangeFormat) =>
  combinedHref(query, { page: 1 }, `/rss/export?format=${format}`);

function sourceOptions(feeds: ExternalFeedStatus[]) {
  return [
    { value: 'all', label: 'Все источники' },
    { value: 'site', label: 'Avocado Travel' },
    { value: 'external', label: 'Все внешние ленты' },
    // Общие пункты — сверху, под ними ленты по алфавиту.
    ...feeds
      .map((feed) => ({ value: feed.id, label: feed.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
  ];
}

/**
 * Из чего собрана общая лента: новости сайта и внешних лент вместе (замечание преподавателя
 * по лабе 4). Числа — ссылки на выборку по источнику с тем же поисковым запросом.
 */
function Composition({ page }: { page: RssPage }) {
  const { site, external } = page.composition;
  const total = site + external;
  const link = (source: string) => combinedHref(page.query, { source, page: 1 });
  return (
    <p className="text-sm text-slate">
      В общей ленте {total} {plural(total, ['новость', 'новости', 'новостей'])}:{' '}
      <Link href={link('site')}>
        {site} — {plural(site, ['новость', 'новости', 'новостей'])} сайта Avocado Travel
      </Link>
      , <Link href={link('external')}>{external} — из внешних лент</Link>. По умолчанию — по дате,
      от новых к старым.
    </p>
  );
}

/** Список новостей общей ленты: «Найдено», из чего собрана, записи и страницы. */
function CombinedList({ page }: { page: RssPage }) {
  return (
    <>
      <p role="status">Найдено новостей: {page.total}</p>
      <Composition page={page} />
      {page.items.length === 0 ? (
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="Ничего не нашлось"
            text="Измените запрос или выберите «Все источники»."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {page.items.map((item) => (
            <CombinedItem key={item.id} item={item} />
          ))}
        </div>
      )}
      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        href={(p) => combinedHref(page.query, { page: p })}
      />
    </>
  );
}

/**
 * Раздел «Поиск по новостям» (лаба 4): общая лента — новости сайта и внешних лент в одном
 * списке — с поиском, выборкой по источнику и сортировкой.
 */
export function CombinedNews({ page }: { page: RssPage }) {
  const { query } = page;
  return (
    <section aria-labelledby="combined-title" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="combined-title" className="text-2xl">
          Поиск по новостям сайта и подключённых RSS-лент
        </h2>
        <p className="text-slate">
          Новости Avocado Travel из базы и новости RSS-лент, которые подключил администратор, — в
          одном списке. Внешние новости открываются на сайте источника.
        </p>
      </div>

      <form
        action="/rss"
        aria-label="Поиск по ленте"
        className="grid items-end gap-4 rounded-md bg-white p-5 shadow-card sm:grid-cols-2 md:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <input type="hidden" name="view" value="search" />
        <Input
          name="q"
          type="search"
          label="Поиск по новостям"
          defaultValue={query.q}
          maxLength={100}
        />
        <Select
          name="source"
          label="Источник"
          defaultValue={query.source}
          options={sourceOptions(page.feeds)}
        />
        <Select
          name="sort"
          label="Порядок"
          defaultValue={query.sort}
          options={(Object.keys(COMBINED_SORTS) as CombinedSort[]).map((key) => ({
            value: key,
            label: COMBINED_SORTS[key],
          }))}
        />
        <div className="flex items-center gap-4">
          <Button type="submit">Показать</Button>
          <Link href="/rss?view=search">Сбросить</Link>
        </div>
      </form>

      <CombinedList page={page} />
      <RssLink href={exportHref(query, 'rss')}>Эта выборка в формате RSS</RssLink>
    </section>
  );
}

const news = (count: number) => plural(count, ['новость', 'новости', 'новостей']);

/**
 * Раздел «Объединённые новости», пока адрес ленты не введён: новости сайта и подключённых
 * RSS-лент одним списком по убыванию дат, одной страницей; под ним — значок RSS на тот же набор.
 */
export function CombinedPreview({ preview }: { preview: MergedPreview }) {
  const total = preview.items.length;
  return (
    <section aria-labelledby="preview-title" className="grid gap-4">
      <h3 id="preview-title" className="text-xl">
        Новости сайта и подключённых RSS-лент
      </h3>
      <p role="status">
        Объединено {total} {news(total)}: {preview.siteCount} — {news(preview.siteCount)} сайта
        Avocado Travel из базы, {preview.feedCount} — из подключённых RSS-лент.
      </p>
      <p className="text-sm text-slate">
        Порядок — по дате, от новых к старым: новости сайта и лент вместе, на одной странице.
      </p>
      <div className="grid gap-3">
        {preview.items.map((item) => (
          <CombinedItem key={`${item.isExternal ? 'feed' : 'site'}:${item.id}`} item={item} />
        ))}
      </div>
      <RssLink href={mergedRssHref()}>Объединённые новости в формате RSS</RssLink>
    </section>
  );
}

/** Раздел «Выгрузка»: та же общая лента в пяти форматах обмена (L4-03, L4-04). */
export function ExportCard({ page }: { page: RssPage }) {
  const { query } = page;
  return (
    <Card as="section" aria-labelledby="export-title" className="grid gap-3 p-5 md:p-6">
      <h2 id="export-title" className="text-xl">
        Скачать новости
      </h2>
      <p className="text-sm text-slate">
        Новости сайта и подключённых лент ({page.total}, до 500 штук) с полями id, title, summary,
        published_at, link, source, category — для других программ: CSV для таблиц, XML, RSS, текст
        ASCII через табуляцию со списком полей в первой строке и тот же текст, оконтуренный
        XML-тегами. Выборку по условиям можно скачать в разделе «Поиск по новостям».
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {(Object.keys(EXCHANGE_FORMATS) as ExchangeFormat[]).map((format) => (
          <li key={format}>
            <a href={exportHref(query, format)} download className="font-semibold">
              {EXCHANGE_FORMATS[format].label} ↓
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

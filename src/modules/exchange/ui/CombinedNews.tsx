import Link from 'next/link';
import { plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
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
import type { RssPage } from '../server/feeds';

const published = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

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
      , <Link href={link('external')}>{external} — из внешних лент</Link>. По умолчанию они идут
      вперемешку: на каждые три внешние новости — две новости сайта.
    </p>
  );
}

/**
 * Общая лента (лаба 4): новости сайта и внешних лент в одном списке — поиск, выборка по
 * источнику, сортировка и выгрузка того же списка в пяти форматах обмена.
 */
export function CombinedNews({ page }: { page: RssPage }) {
  const { query } = page;
  return (
    <section aria-labelledby="combined-title" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="combined-title" className="text-2xl">
          Общая лента новостей
        </h2>
        <p className="text-slate">
          Новости Avocado Travel и подключённых лент вместе. Внешние новости открываются на сайте
          источника.
        </p>
      </div>

      <form
        action="/rss"
        aria-label="Поиск по ленте"
        className="grid items-end gap-4 rounded-md bg-white p-5 shadow-card sm:grid-cols-2 md:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
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
          <Link href="/rss">Сбросить</Link>
        </div>
      </form>

      <Card as="section" aria-labelledby="export-title" className="grid gap-3 p-5 md:p-6">
        <h3 id="export-title" className="text-lg">
          Скачать эту выборку
        </h3>
        <p className="text-sm text-slate">
          Те же новости ({page.total}, до 500 штук) с полями id, title, summary, published_at, link,
          source, category — для других программ: CSV для таблиц, XML, RSS, текст ASCII через
          табуляцию со списком полей в первой строке и тот же текст, оконтуренный XML-тегами.
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
            <Card as="article" key={item.id} className="grid gap-2 p-5">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
                <Badge>{item.source}</Badge>
                <time dateTime={item.publishedAt.toISOString()}>
                  {published.format(item.publishedAt)}
                </time>
              </p>
              <h3 className="text-lg">
                {item.isExternal ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.title}
                    <span className="sr-only"> (откроется на сайте источника)</span>
                  </a>
                ) : (
                  <Link href={new URL(item.url).pathname}>{item.title}</Link>
                )}
              </h3>
              <p className="text-slate">{item.summary}</p>
            </Card>
          ))}
        </div>
      )}
      <Pagination
        page={page.page}
        totalPages={page.totalPages}
        href={(p) => combinedHref(query, { page: p })}
      />
    </section>
  );
}

import Link from 'next/link';
import { plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import type { ExternalFeedStatus } from '../feeds';
import type { MergedFeedError, MergedFeedResult } from '../server/feeds';
import { mergedRssHref } from '../rss-tab';
import { CombinedItem } from './CombinedItem';
import { RssLink } from './RssLink';

const ERRORS: Record<Exclude<MergedFeedError, 'INVALID_URL'>, string> = {
  NOT_A_FEED:
    'По этому адресу нет ленты RSS или Atom, или сайт не ответил. Проверьте адрес — он часто заканчивается на /rss, /feed или .xml.',
  EMPTY: 'Лента разобрана, но в ней нет новостей, которые можно показать.',
  TOO_MANY_REQUESTS: 'Слишком много запросов подряд. Подождите минуту и попробуйте снова.',
};

const news = (count: number) => plural(count, ['новость', 'новости', 'новостей']);

function Result({ result }: { result: MergedFeedResult }) {
  if (!result.ok) {
    return (
      <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
        {result.error === 'INVALID_URL'
          ? (result.message ?? 'Проверьте адрес ленты.')
          : ERRORS[result.error]}
      </p>
    );
  }
  const { data } = result;
  return (
    <div className="grid gap-3">
      <p role="status">
        Объединено {data.items.length} {news(data.items.length)}: {data.siteCount} —{' '}
        {plural(data.siteCount, ['новость', 'новости', 'новостей'])} сайта Avocado Travel из базы,{' '}
        {data.feedCount} — из ленты {data.source}.
        {data.skipped > 0
          ? ` Ещё ${data.skipped} ${plural(data.skipped, ['запись', 'записи', 'записей'])} ленты не показаны: без ссылки или про настоящие авиакомпании (авиакомпании на сайте выдуманные).`
          : null}
      </p>
      <p className="text-sm text-slate">
        Порядок — по дате, от новых к старым: новости сайта и ленты вместе, на одной странице. Лента
        не сохраняется: это просмотр. <Link href="/rss#merged">Убрать ленту</Link>
      </p>
      <div className="grid gap-3">
        {data.items.map((item) => (
          <CombinedItem key={`${item.isExternal ? 'feed' : 'site'}:${item.id}`} item={item} />
        ))}
      </div>
      <RssLink href={mergedRssHref(data.url)}>Эти объединённые новости в формате RSS</RssLink>
    </div>
  );
}

/**
 * Объединённые новости (замечание преподавателя по лабе 4): поле для адреса любой ленты RSS
 * или Atom — сайт скачивает её, делит на записи и показывает по дате вместе с новостями сайта из
 * базы. Обычная форма GET: результат — страница с адресом `/rss?feed=…`, работает без JavaScript.
 */
export function MergedFeed({
  url,
  result,
  feeds,
}: {
  url: string;
  result: MergedFeedResult | null;
  feeds: ExternalFeedStatus[];
}) {
  const examples = [...feeds].sort((a, b) => a.name.localeCompare(b.name, 'ru')).slice(0, 4);
  return (
    <section id="merged" aria-labelledby="merged-title" className="grid scroll-mt-4 gap-4">
      <div className="grid max-w-3xl gap-1">
        <h2 id="merged-title" className="text-2xl">
          Объединённые новости: сайт + любая RSS-лента
        </h2>
        <p className="text-slate">
          Введите адрес любой ленты RSS или Atom. Сайт скачает её, проверит формат, разделит на
          записи и покажет их на этой странице вместе с новостями Avocado Travel из базы данных.
          Входить не нужно.
        </p>
      </div>

      <Card className="grid gap-3 p-5 md:p-6">
        <form
          action="/rss#merged"
          aria-label="Объединить с RSS-лентой"
          className="flex flex-wrap items-end gap-4"
        >
          <Input
            name="feed"
            type="url"
            label="Адрес RSS-ленты"
            placeholder="https://example.com/rss.xml"
            defaultValue={url}
            maxLength={500}
            required
            className="min-w-64 flex-1"
          />
          <Button type="submit">Объединить</Button>
        </form>
        {examples.length > 0 ? (
          <p className="text-sm">
            <span className="text-slate">Для примера — ленты, подключённые на сайте: </span>
            {examples.map((feed, index) => (
              <span key={feed.id}>
                {index > 0 ? ', ' : null}
                <Link href={`/rss?feed=${encodeURIComponent(feed.url)}#merged`}>{feed.name}</Link>
              </span>
            ))}
          </p>
        ) : null}
      </Card>

      {result ? (
        <Result result={result} />
      ) : (
        <p className="text-slate">
          Пока адрес не введён, ниже — новости сайта вместе с RSS-лентами, которые подключил
          администратор.
        </p>
      )}
    </section>
  );
}

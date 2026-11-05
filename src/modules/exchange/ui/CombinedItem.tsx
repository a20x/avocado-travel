import Link from 'next/link';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import type { CombinedNewsItem } from '../combined';

const published = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

/**
 * Новость в общей ленте: источник, дата, заголовок-ссылка и краткое описание. Метка новости
 * сайта — зелёная, у RSS-лент — серая: новости Avocado Travel сразу видны среди лент.
 */
export function CombinedItem({ item }: { item: CombinedNewsItem }) {
  return (
    <Card as="article" className="grid gap-2 p-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
        <Badge tone={item.isExternal ? 'neutral' : 'success'}>{item.source}</Badge>
        <time dateTime={item.publishedAt.toISOString()}>{published.format(item.publishedAt)}</time>
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
      {item.summary ? <p className="text-slate">{item.summary}</p> : null}
    </Card>
  );
}

import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import type { IndustryNewsItem } from '../model';
import { newsDate } from './NewsCard';

/**
 * Новость отрасли: источник, рубрика, дата, заголовок-ссылка на оригинал и краткое описание.
 * Своей страницы у неё нет — полный текст читают на сайте источника.
 */
export function IndustryNewsCard({
  item,
  sourceName,
  categoryLabel,
}: {
  item: IndustryNewsItem;
  sourceName: string;
  categoryLabel: string;
}) {
  return (
    <Card as="article" className="grid gap-2 p-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
        <Badge>{categoryLabel}</Badge>
        <time dateTime={item.publishedAt.toISOString()}>{newsDate(item.publishedAt)}</time>
        <span>{sourceName}</span>
      </p>
      <h2 className="text-xl">
        <a
          href={item.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-graphite hover:text-leaf"
        >
          {item.title}
          <span className="sr-only"> (откроется на сайте источника в новой вкладке)</span>
        </a>
      </h2>
      {item.summary ? <p className="text-slate">{item.summary}</p> : null}
      {item.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-sm" aria-label="Теги">
          {item.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-mist px-2.5 py-0.5 text-slate">
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

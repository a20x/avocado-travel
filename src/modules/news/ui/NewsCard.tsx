import Link from 'next/link';
import { formatDate } from '@/shared/lib/format';
import { dateInZone } from '@/shared/lib/time';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { NEWS_CATEGORIES, isNewsCategory, type NewsListItem } from '../model';

/** Дата новости — по Москве: сайт российский, новости пишутся по московскому времени. */
export function newsDate(publishedAt: Date): string {
  return formatDate(dateInZone(publishedAt, 'Europe/Moscow'));
}

/** Новость в ленте: рубрика, дата, заголовок-ссылка и краткое описание. */
export function NewsCard({ item }: { item: NewsListItem }) {
  return (
    <Card as="article" className="grid gap-2 p-5">
      <p className="flex flex-wrap items-center gap-3 text-sm text-slate">
        {isNewsCategory(item.category) ? <Badge>{NEWS_CATEGORIES[item.category]}</Badge> : null}
        <time dateTime={item.publishedAt.toISOString()}>{newsDate(item.publishedAt)}</time>
      </p>
      <h2 className="text-xl">
        <Link href={`/news/${item.slug}`} className="text-graphite hover:text-leaf">
          {item.title}
        </Link>
      </h2>
      <p className="text-slate">{item.summary}</p>
    </Card>
  );
}

import Link from 'next/link';
import { plural } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { topicHref, type TopicSummary } from '../model';
import { postDate } from './format';

/** Список тем: заголовок, автор, число сообщений и время последнего. */
export function TopicList({ topics }: { topics: TopicSummary[] }) {
  return (
    <ul className="grid gap-3">
      {topics.map((topic) => (
        <li key={topic.id}>
          <Card className="grid gap-x-6 gap-y-2 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="grid gap-1">
              <h2 className="text-lg break-words">
                <Link href={topicHref(topic.id)}>{topic.title}</Link>
              </h2>
              <p className="text-sm text-slate">
                {topic.authorName} · создана {postDate(topic.createdAt)}
              </p>
            </div>
            <p className="grid text-sm text-slate sm:text-right">
              <span className="font-semibold text-graphite">
                {topic.postsCount}{' '}
                {plural(topic.postsCount, ['сообщение', 'сообщения', 'сообщений'])}
              </span>
              <span>
                последнее{' '}
                <time dateTime={topic.lastPostAt.toISOString()}>{postDate(topic.lastPostAt)}</time>
              </span>
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { getNews } from '@/modules/news/server';
import { NewsBody, newsDate } from '@/modules/news/ui';
import { Badge } from '@/shared/ui/Badge';
import { pageMetadata } from '@/shared/lib/metadata';

// Новость нужна и для заголовка вкладки, и для страницы — cache не даёт сходить в базу дважды.
const loadNews = cache((slug: string) => getNews(slug));

export async function generateMetadata(props: PageProps<'/news/[slug]'>): Promise<Metadata> {
  const item = await loadNews((await props.params).slug);
  if (!item) return {};
  const metadata = pageMetadata({
    title: item.title,
    description: item.summary,
    path: `/news/${item.slug}`,
  });
  // Для новости — тип «статья» с датой публикации.
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      publishedTime: item.publishedAt.toISOString(),
    },
  };
}

export default async function NewsItemPage(props: PageProps<'/news/[slug]'>) {
  const item = await loadNews((await props.params).slug);
  if (!item) notFound();

  return (
    <article className="container-site grid gap-6 py-8">
      <p>
        <Link href="/news">← Все новости</Link>
      </p>
      <header className="grid max-w-3xl gap-3">
        <p className="flex flex-wrap items-center gap-3 text-sm text-slate">
          {isNewsCategory(item.category) ? <Badge>{NEWS_CATEGORIES[item.category]}</Badge> : null}
          <time dateTime={item.publishedAt.toISOString()}>{newsDate(item.publishedAt)}</time>
        </p>
        <h1 className="text-3xl">{item.title}</h1>
        <p className="text-xl text-slate">{item.summary}</p>
      </header>
      <NewsBody body={item.body} />
    </article>
  );
}

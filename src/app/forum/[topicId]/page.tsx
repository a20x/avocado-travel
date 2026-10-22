import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getCurrentUser } from '@/modules/auth/server';
import { canEditPost, topicHref } from '@/modules/forum';
import { getTopic, listPosts } from '@/modules/forum/server';
import { PostList, ReplyForm } from '@/modules/forum/ui';
import { plural } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Pagination } from '@/shared/ui/Pagination';

// Тема нужна и для заголовка вкладки, и для страницы — cache не даёт сходить в базу дважды.
const loadTopic = cache(async (id: string) => getTopic(id));

export async function generateMetadata(props: PageProps<'/forum/[topicId]'>): Promise<Metadata> {
  const result = await loadTopic((await props.params).topicId);
  return result.ok ? { title: `${result.data.title} — форум` } : {};
}

export default async function TopicPage(props: PageProps<'/forum/[topicId]'>) {
  const [{ topicId }, params] = await Promise.all([props.params, props.searchParams]);
  const result = await loadTopic(topicId);
  if (!result.ok) notFound();

  const topic = result.data;
  const [{ items, page, totalPages }, user] = await Promise.all([
    listPosts(topic, { page: params.page }),
    getCurrentUser(),
  ]);
  const now = new Date();
  // Режим правки — только для своего сообщения, которое ещё можно изменить.
  const editId = items.find(
    (post) => post.id === params.edit && canEditPost(post, user?.id, now),
  )?.id;
  const pageHref = topicHref(topic.id, page);

  return (
    <div className="container-site grid max-w-4xl gap-6 py-8">
      <p>
        <Link href="/forum">← Все темы</Link>
      </p>
      <header className="grid gap-1">
        <h1 className="text-3xl break-words">{topic.title}</h1>
        <p className="text-slate">
          {topic.postsCount} {plural(topic.postsCount, ['сообщение', 'сообщения', 'сообщений'])}
        </p>
      </header>

      <section aria-labelledby="posts-title" className="grid gap-4">
        <h2 id="posts-title" className="sr-only">
          Сообщения
        </h2>
        <PostList topic={topic} posts={items} page={page} user={user} editId={editId} now={now} />
        <Pagination page={page} totalPages={totalPages} href={(p) => topicHref(topic.id, p)} />
      </section>

      {/* В режиме правки форма ответа скрыта: на странице одна форма с текстом сообщения. */}
      {editId ? null : user ? (
        <ReplyForm topicId={topic.id} permalink={pageHref} />
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p>Чтобы ответить в теме, войдите или зарегистрируйтесь.</p>
          <Link
            href={`/login?next=${encodeURIComponent(pageHref)}`}
            className={buttonClasses({ variant: 'secondary' })}
          >
            Войти
          </Link>
        </Card>
      )}
    </div>
  );
}

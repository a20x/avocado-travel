import Link from 'next/link';
import type { SessionUser } from '@/modules/auth';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import {
  canEditPost,
  editMinutesLeft,
  topicHref,
  type ForumPost,
  type TopicDetails,
} from '../model';
import { deletePostAction, deleteTopicAction } from '../server/actions';
import { EditPostForm } from './EditPostForm';
import { postDate } from './format';

type PostListProps = {
  topic: TopicDetails;
  posts: ForumPost[];
  page: number;
  user: SessionUser | null;
  /** Сообщение в режиме правки (`?edit=…`). */
  editId?: string;
  now: Date;
};

/** Адрес режима правки сообщения на текущей странице темы. */
function editHref(topicId: string, page: number, postId: string): string {
  const base = topicHref(topicId, page);
  return `${base}${base.includes('?') ? '&' : '?'}edit=${postId}#post-${postId}`;
}

/**
 * Сообщения темы. Текст выводится как текст, с сохранением переносов строк: React экранирует
 * его, поэтому санитайзер не нужен. Автор видит «Изменить» первые 15 минут, администратор —
 * удаление; первое сообщение удаляется только вместе с темой.
 */
export function PostList({ topic, posts, page, user, editId, now }: PostListProps) {
  const pageHref = topicHref(topic.id, page);
  const isAdmin = user?.role === 'admin';

  return (
    <ol className="grid gap-4">
      {posts.map((post, index) => {
        const isFirst = page === 1 && index === 0;
        const editable = canEditPost(post, user?.id, now);
        const editing = editable && post.id === editId;
        return (
          <li key={post.id} id={`post-${post.id}`} className="scroll-mt-4">
            <Card as="article" className="grid gap-3 p-5">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg">{post.authorName}</h3>
                {post.authorId === topic.authorId ? <Badge tone="accent">автор темы</Badge> : null}
                <span className="text-sm text-slate">
                  <time dateTime={post.createdAt.toISOString()}>{postDate(post.createdAt)}</time>
                  {post.updatedAt ? ' · изменено' : null}
                </span>
              </header>

              {editing ? (
                <EditPostForm
                  topicId={topic.id}
                  postId={post.id}
                  body={post.body}
                  backHref={`${pageHref}#post-${post.id}`}
                  permalink={editHref(topic.id, page, post.id)}
                />
              ) : (
                <p className="break-words whitespace-pre-line">{post.body}</p>
              )}

              {(editable && !editing) || isAdmin ? (
                <footer className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
                  {editable && !editing ? (
                    <Link href={editHref(topic.id, page, post.id)}>
                      Изменить
                      <span className="text-slate">
                        {' '}
                        · ещё {editMinutesLeft(post.createdAt, now)} мин
                      </span>
                    </Link>
                  ) : null}
                  {isAdmin && isFirst ? (
                    <ConfirmButton
                      label="Удалить тему"
                      title="Удалить тему?"
                      text={`Тема «${topic.title}» и все сообщения в ней будут удалены насовсем.`}
                      confirmLabel="Удалить"
                      action={deleteTopicAction}
                      permalink={pageHref}
                    >
                      <input type="hidden" name="topicId" value={topic.id} />
                    </ConfirmButton>
                  ) : null}
                  {isAdmin && !isFirst ? (
                    <ConfirmButton
                      label="Удалить"
                      title="Удалить сообщение?"
                      text={`Сообщение пользователя ${post.authorName} будет удалено насовсем.`}
                      confirmLabel="Удалить"
                      action={deletePostAction}
                      permalink={pageHref}
                    >
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input type="hidden" name="postId" value={post.id} />
                    </ConfirmButton>
                  ) : null}
                </footer>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

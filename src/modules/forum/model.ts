import { z } from 'zod';
import type { SearchDocumentInput } from '@/modules/search';

export const TOPICS_PAGE_SIZE = 20;
export const POSTS_PAGE_SIZE = 10;

/** Автор может изменить своё сообщение 15 минут после публикации (docs/02-product.md). */
export const EDIT_WINDOW_MS = 15 * 60_000;

/** Тема в списке тем. */
export type TopicSummary = {
  id: string;
  title: string;
  authorName: string;
  createdAt: Date;
  lastPostAt: Date;
  postsCount: number;
};

/** Тема на своей странице. */
export type TopicDetails = {
  id: string;
  title: string;
  authorId: string;
  postsCount: number;
};

export type ForumPost = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  updatedAt: Date | null;
};

const body = z
  .string()
  .trim()
  .min(1, 'Напишите сообщение')
  .max(5000, 'Сообщение — до 5000 символов');

export const postInputSchema = z.object({ body });
export type PostInput = z.infer<typeof postInputSchema>;

/** Новая тема — заголовок и первое сообщение. */
export const topicInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Заголовок — от 5 символов')
    .max(120, 'Заголовок — до 120 символов'),
  body,
});
export type TopicInput = z.infer<typeof topicInputSchema>;

export type ForumError =
  'NOT_FOUND' | 'FORBIDDEN' | 'EDIT_EXPIRED' | 'FIRST_POST' | 'TOO_MANY_REQUESTS';

/** Может ли пользователь изменить сообщение: только своё и только первые 15 минут. */
export function canEditPost(
  post: { authorId: string; createdAt: Date },
  userId: string | null | undefined,
  now: Date,
): boolean {
  return post.authorId === userId && now.getTime() - post.createdAt.getTime() < EDIT_WINDOW_MS;
}

/** Сколько целых минут ещё можно править сообщение (не меньше 1, пока правка доступна). */
export function editMinutesLeft(createdAt: Date, now: Date): number {
  const left = createdAt.getTime() + EDIT_WINDOW_MS - now.getTime();
  return Math.max(1, Math.ceil(left / 60_000));
}

/** На какой странице темы стоит сообщение с порядковым номером `position` (с единицы). */
export function pageOfPosition(position: number, pageSize = POSTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(position / pageSize));
}

/** Адрес страницы темы: первая страница — без параметра. */
export function topicHref(topicId: string, page = 1): string {
  return page > 1 ? `/forum/${topicId}?page=${page}` : `/forum/${topicId}`;
}

/** Документ поискового индекса для темы: заголовок и все сообщения — тема ищется целиком. */
export function topicSearchDocument(
  topic: { id: string; title: string },
  posts: string[],
): SearchDocumentInput {
  return {
    kind: 'forum',
    refId: topic.id,
    url: topicHref(topic.id),
    title: topic.title,
    body: posts.join('\n\n'),
    visibleFrom: null,
  };
}

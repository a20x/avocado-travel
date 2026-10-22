import 'server-only';
import { z } from 'zod';
import type { SessionUser } from '@/modules/auth';
import { env } from '@/server/env';
import { takeRateLimit } from '@/server/rate-limit';
import { getClientIp } from '@/server/request';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  POSTS_PAGE_SIZE,
  TOPICS_PAGE_SIZE,
  canEditPost,
  pageOfPosition,
  type ForumError,
  type ForumPost,
  type PostInput,
  type TopicDetails,
  type TopicInput,
  type TopicSummary,
} from '../model';
import * as repository from './repository';

/** Новых тем и ответов с одного IP — не больше 5 в минуту: защита от спама. */
const POST_LIMIT = { limit: 5, windowMs: 60_000 };

type Page<T> = { items: T[]; page: number; totalPages: number };

/** Где сообщение после сохранения: тема и страница с ним. */
type PostLocation = { topicId: string; postId: string; page: number };

function pageNumber(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

const totalPages = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));

const parseId = (id: unknown) => z.uuid().safeParse(id);

async function withinLimit(): Promise<boolean> {
  return env.RATE_LIMIT_DISABLED || takeRateLimit(`forum:${await getClientIp()}`, POST_LIMIT);
}

export async function listTopics(params: { page?: unknown }): Promise<Page<TopicSummary>> {
  const page = pageNumber(params.page);
  const { items, total } = await repository.findTopics({
    limit: TOPICS_PAGE_SIZE,
    offset: (page - 1) * TOPICS_PAGE_SIZE,
  });
  return { items, page, totalPages: totalPages(total, TOPICS_PAGE_SIZE) };
}

export async function getTopic(id: unknown): Promise<Result<TopicDetails, 'NOT_FOUND'>> {
  const parsed = parseId(id);
  const topic = parsed.success ? await repository.findTopic(parsed.data) : null;
  return topic ? ok(topic) : fail('NOT_FOUND');
}

/**
 * Сообщения темы постранично. Номер страницы больше последней (например, после удаления
 * сообщений) превращается в последнюю.
 */
export async function listPosts(
  topic: TopicDetails,
  params: { page?: unknown },
): Promise<Page<ForumPost>> {
  const pages = totalPages(topic.postsCount, POSTS_PAGE_SIZE);
  const page = Math.min(pageNumber(params.page), pages);
  const items = await repository.findPosts(topic.id, {
    limit: POSTS_PAGE_SIZE,
    offset: (page - 1) * POSTS_PAGE_SIZE,
  });
  return { items, page, totalPages: pages };
}

/* Изменения. Вход проверяет action; здесь — правила форума. */

export async function createTopic(
  user: SessionUser,
  input: TopicInput,
): Promise<Result<{ topicId: string }, ForumError>> {
  if (!(await withinLimit())) return fail('TOO_MANY_REQUESTS');
  const topicId = await repository.insertTopic({ ...input, authorId: user.id });
  return ok({ topicId });
}

export async function reply(
  user: SessionUser,
  topicId: unknown,
  input: PostInput,
): Promise<Result<PostLocation, ForumError>> {
  const parsed = parseId(topicId);
  if (!parsed.success) return fail('NOT_FOUND');
  if (!(await withinLimit())) return fail('TOO_MANY_REQUESTS');
  const saved = await repository.insertReply({
    topicId: parsed.data,
    authorId: user.id,
    body: input.body,
  });
  if (!saved) return fail('NOT_FOUND');
  return ok({ topicId: parsed.data, postId: saved.postId, page: pageOfPosition(saved.position) });
}

/** Правка своего сообщения в первые 15 минут (docs/02-product.md). */
export async function editPost(
  user: SessionUser,
  postId: unknown,
  input: PostInput,
  now = new Date(),
): Promise<Result<PostLocation, ForumError>> {
  const parsed = parseId(postId);
  const post = parsed.success ? await repository.findPost(parsed.data) : null;
  if (!post) return fail('NOT_FOUND');
  if (post.authorId !== user.id) return fail('FORBIDDEN');
  if (!canEditPost(post, user.id, now)) return fail('EDIT_EXPIRED');

  await repository.updatePostBody(post.id, input.body);
  const position = await repository.countPostsUpTo(post.topicId, post.createdAt);
  return ok({ topicId: post.topicId, postId: post.id, page: pageOfPosition(position) });
}

/* Модерация. Права администратора проверяет action. */

export async function deletePost(
  postId: unknown,
): Promise<Result<{ topicId: string }, ForumError>> {
  const parsed = parseId(postId);
  const post = parsed.success ? await repository.findPost(parsed.data) : null;
  if (!post) return fail('NOT_FOUND');
  if ((await repository.findFirstPostId(post.topicId)) === post.id) return fail('FIRST_POST');
  const deleted = await repository.deletePost(post.id, post.topicId);
  return deleted ? ok({ topicId: post.topicId }) : fail('NOT_FOUND');
}

export async function deleteTopic(topicId: unknown): Promise<Result<null, ForumError>> {
  const parsed = parseId(topicId);
  if (!parsed.success) return fail('NOT_FOUND');
  return (await repository.deleteTopic(parsed.data)) ? ok(null) : fail('NOT_FOUND');
}

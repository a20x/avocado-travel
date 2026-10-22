import 'server-only';
import { and, asc, count, desc, eq, lte, sql } from 'drizzle-orm';
import { users } from '@/modules/auth';
import { db } from '@/server/db';
import type { ForumPost, TopicDetails, TopicSummary } from '../model';
import { forumPosts, forumTopics } from '../schema';

type Paging = { limit: number; offset: number };

/** Темы, свежие обсуждения сверху. */
export async function findTopics(
  paging: Paging,
): Promise<{ items: TopicSummary[]; total: number }> {
  const [items, [totals]] = await Promise.all([
    db
      .select({
        id: forumTopics.id,
        title: forumTopics.title,
        authorName: users.name,
        createdAt: forumTopics.createdAt,
        lastPostAt: forumTopics.lastPostAt,
        postsCount: forumTopics.postsCount,
      })
      .from(forumTopics)
      .innerJoin(users, eq(users.id, forumTopics.authorId))
      .orderBy(desc(forumTopics.lastPostAt))
      .limit(paging.limit)
      .offset(paging.offset),
    db.select({ total: count() }).from(forumTopics),
  ]);
  return { items, total: totals?.total ?? 0 };
}

export async function findTopic(id: string): Promise<TopicDetails | null> {
  const [topic] = await db
    .select({
      id: forumTopics.id,
      title: forumTopics.title,
      authorId: forumTopics.authorId,
      postsCount: forumTopics.postsCount,
    })
    .from(forumTopics)
    .where(eq(forumTopics.id, id));
  return topic ?? null;
}

/** Сообщения темы по порядку публикации. */
export function findPosts(topicId: string, paging: Paging): Promise<ForumPost[]> {
  return db
    .select({
      id: forumPosts.id,
      authorId: forumPosts.authorId,
      authorName: users.name,
      body: forumPosts.body,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
    })
    .from(forumPosts)
    .innerJoin(users, eq(users.id, forumPosts.authorId))
    .where(eq(forumPosts.topicId, topicId))
    .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id))
    .limit(paging.limit)
    .offset(paging.offset);
}

export async function findPost(id: string) {
  const [post] = await db
    .select({
      id: forumPosts.id,
      topicId: forumPosts.topicId,
      authorId: forumPosts.authorId,
      createdAt: forumPosts.createdAt,
    })
    .from(forumPosts)
    .where(eq(forumPosts.id, id));
  return post ?? null;
}

/** Первое сообщение темы — её текст: удаляется только вместе с темой. */
export async function findFirstPostId(topicId: string): Promise<string | null> {
  const [post] = await db
    .select({ id: forumPosts.id })
    .from(forumPosts)
    .where(eq(forumPosts.topicId, topicId))
    .orderBy(asc(forumPosts.createdAt), asc(forumPosts.id))
    .limit(1);
  return post?.id ?? null;
}

/** Порядковый номер сообщения в теме (с единицы) — чтобы открыть нужную страницу. */
export async function countPostsUpTo(topicId: string, createdAt: Date): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(forumPosts)
    .where(and(eq(forumPosts.topicId, topicId), lte(forumPosts.createdAt, createdAt)));
  return row?.total ?? 0;
}

/** Тема вместе с первым сообщением — одной транзакцией. */
export async function insertTopic(values: {
  title: string;
  body: string;
  authorId: string;
}): Promise<string> {
  return db.transaction(async (tx) => {
    const [topic] = await tx
      .insert(forumTopics)
      .values({ title: values.title, authorId: values.authorId, postsCount: 1 })
      .returning({ id: forumTopics.id });
    if (!topic) throw new Error('Тема не создана');
    await tx
      .insert(forumPosts)
      .values({ topicId: topic.id, authorId: values.authorId, body: values.body });
    return topic.id;
  });
}

/**
 * Ответ в теме. Счётчик и время последнего сообщения обновляются в той же транзакции;
 * обновление строки темы заодно не даёт двум ответам получить один номер.
 * null — темы нет (её удалили).
 */
export async function insertReply(values: {
  topicId: string;
  authorId: string;
  body: string;
}): Promise<{ postId: string; position: number } | null> {
  return db.transaction(async (tx) => {
    const [topic] = await tx
      .update(forumTopics)
      .set({ postsCount: sql`${forumTopics.postsCount} + 1`, lastPostAt: sql`now()` })
      .where(eq(forumTopics.id, values.topicId))
      .returning({ postsCount: forumTopics.postsCount });
    if (!topic) return null;
    const [post] = await tx.insert(forumPosts).values(values).returning({ id: forumPosts.id });
    if (!post) throw new Error('Сообщение не сохранено');
    return { postId: post.id, position: topic.postsCount };
  });
}

export async function updatePostBody(id: string, body: string): Promise<boolean> {
  const updated = await db
    .update(forumPosts)
    .set({ body, updatedAt: new Date() })
    .where(eq(forumPosts.id, id))
    .returning({ id: forumPosts.id });
  return updated.length > 0;
}

/** Удаляет сообщение и пересчитывает счётчик и время последнего сообщения темы. */
export async function deletePost(id: string, topicId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(forumPosts)
      .where(and(eq(forumPosts.id, id), eq(forumPosts.topicId, topicId)))
      .returning({ id: forumPosts.id });
    if (deleted.length === 0) return false;
    await tx
      .update(forumTopics)
      .set({
        postsCount: sql`(select count(*) from ${forumPosts} where ${forumPosts.topicId} = ${topicId})`,
        lastPostAt: sql`coalesce((select max(${forumPosts.createdAt}) from ${forumPosts} where ${forumPosts.topicId} = ${topicId}), ${forumTopics.createdAt})`,
      })
      .where(eq(forumTopics.id, topicId));
    return true;
  });
}

/** Тема со всеми сообщениями (каскадом). */
export async function deleteTopic(id: string): Promise<boolean> {
  const deleted = await db
    .delete(forumTopics)
    .where(eq(forumTopics.id, id))
    .returning({ id: forumTopics.id });
  return deleted.length > 0;
}

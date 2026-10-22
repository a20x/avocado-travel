/**
 * Модуль forum: темы и сообщения (L1-S03).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/forum/server`,
 * компоненты — в `@/modules/forum/ui` (ADR-0008).
 */
export { forumPosts, forumTopics } from './schema';
export {
  EDIT_WINDOW_MS,
  POSTS_PAGE_SIZE,
  TOPICS_PAGE_SIZE,
  canEditPost,
  editMinutesLeft,
  pageOfPosition,
  postInputSchema,
  topicHref,
  topicInputSchema,
} from './model';
export type {
  ForumError,
  ForumPost,
  PostInput,
  TopicDetails,
  TopicInput,
  TopicSummary,
} from './model';

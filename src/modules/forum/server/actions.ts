'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin, requireUser } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import { postInputSchema, topicHref, topicInputSchema, type ForumError } from '../model';
import * as service from './service';

export type ForumFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'title' | 'body', string>>;
  /** Введённое — чтобы после ошибки не набирать сообщение заново. */
  values?: { title?: string; body?: string };
};

const MESSAGES: Record<ForumError, string> = {
  NOT_FOUND: 'Тема или сообщение не найдены — возможно, их уже удалили.',
  FORBIDDEN: 'Изменять можно только свои сообщения.',
  EDIT_EXPIRED: 'Сообщение можно изменить только в первые 15 минут после публикации.',
  FIRST_POST: 'Первое сообщение удаляется только вместе с темой.',
  TOO_MANY_REQUESTS: 'Слишком много сообщений подряд. Подождите минуту и отправьте снова.',
};

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const result: ForumFormState['fieldErrors'] = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if ((field === 'title' || field === 'body') && !result[field]) result[field] = issue.message;
  }
  return result;
}

/** Адрес темы для возврата после входа; чужое значение из формы в адрес не попадает. */
function topicPath(value: FormDataEntryValue | null): string {
  const id = z.uuid().safeParse(value);
  return id.success ? topicHref(id.data) : '/forum';
}

/**
 * Переход к сохранённому сообщению. Адрес часто отличается от текущего только якорем, и роутер
 * считает это прокруткой, а не новой страницей, — поэтому страница темы обновляется явно.
 */
function redirectToPost(location: { topicId: string; postId: string; page: number }): never {
  revalidatePath(topicHref(location.topicId));
  redirect(`${topicHref(location.topicId, location.page)}#post-${location.postId}`);
}

export async function createTopicAction(
  _: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  // Права — в каждом action: страница уже проверила вход, но запрос можно отправить и в обход неё.
  const user = await requireUser('/forum/new');
  const values = {
    title: String(formData.get('title') ?? ''),
    body: String(formData.get('body') ?? ''),
  };
  const parsed = topicInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };

  const result = await service.createTopic(user, parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };
  redirect(topicHref(result.data.topicId));
}

export async function replyAction(_: ForumFormState, formData: FormData): Promise<ForumFormState> {
  const user = await requireUser(topicPath(formData.get('topicId')));
  const values = { body: String(formData.get('body') ?? '') };
  const parsed = postInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };

  const result = await service.reply(user, formData.get('topicId'), parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };
  redirectToPost(result.data);
}

export async function editPostAction(
  _: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const user = await requireUser(topicPath(formData.get('topicId')));
  const values = { body: String(formData.get('body') ?? '') };
  const parsed = postInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };

  const result = await service.editPost(user, formData.get('postId'), parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };
  redirectToPost(result.data);
}

/* Модерация: удаляет только администратор. */

export async function deletePostAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(topicPath(formData.get('topicId')));
  const result = await service.deletePost(formData.get('postId'));
  if (!result.ok) return { error: MESSAGES[result.error] };
  revalidatePath(topicHref(result.data.topicId));
  return null;
}

export async function deleteTopicAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(topicPath(formData.get('topicId')));
  const result = await service.deleteTopic(formData.get('topicId'));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect('/forum?deleted=1');
}

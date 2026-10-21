'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { newsInputSchema, type NewsError } from '../model';
import * as service from './service';

export type NewsFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Введённое — чтобы после ошибки не набирать новость заново. */
  values?: Record<string, string>;
};

const MESSAGES: Record<NewsError, string> = {
  NOT_FOUND: 'Новость не найдена — возможно, её уже удалили.',
  SLUG_TAKEN: 'Такой адрес уже занят другой новостью. Укажите другой.',
};

const FIELDS = ['title', 'slug', 'summary', 'body', 'category', 'publishedDate', 'publishedTime'];

function readForm(formData: FormData) {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? '')]));
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}

/** Создание и редактирование — одна форма: с `id` в форме — правка, без — новая новость. */
export async function saveNewsAction(_: NewsFormState, formData: FormData): Promise<NewsFormState> {
  // Права — в каждом action: страница админки уже проверила, но запрос можно отправить и в обход неё.
  await requireAdmin();
  const values = readForm(formData);
  const parsed = newsInputSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };

  const id = String(formData.get('id') ?? '');
  const result = id
    ? await service.updateNews(id, parsed.data)
    : await service.createNews(parsed.data);
  if (!result.ok) {
    return result.error === 'SLUG_TAKEN'
      ? { fieldErrors: { slug: MESSAGES.SLUG_TAKEN }, values }
      : { error: MESSAGES[result.error], values };
  }
  redirect(`/admin/news?saved=${encodeURIComponent(result.data.slug)}`);
}

export async function deleteNewsAction(
  _: NewsFormState,
  formData: FormData,
): Promise<NewsFormState> {
  await requireAdmin();
  const result = await service.deleteNews(formData.get('id'));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect('/admin/news?deleted=1');
}

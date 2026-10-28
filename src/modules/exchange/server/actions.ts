'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import type { RssPreview } from './feeds';
import * as service from './feeds';

const PATH = '/rss';

const ADD_MESSAGES: Record<Exclude<service.AddFeedError, 'INVALID'>, string> = {
  LIMIT: 'Подключено уже 10 лент — сначала отключите ненужную.',
  DUPLICATE: 'Эта лента уже подключена.',
  NOT_A_FEED:
    'По адресу нет ленты RSS или Atom, или сайт не ответил. Проверьте адрес — он часто заканчивается на /rss или /feed.',
};

export type FeedFormState = { error?: string; success?: string } | null;

/** Подключить внешнюю ленту — только администратор (проверка здесь, а не только в интерфейсе). */
export async function addFeedAction(_: FeedFormState, formData: FormData): Promise<FeedFormState> {
  await requireAdmin(PATH);
  const result = await service.addFeed({
    url: formData.get('url'),
    name: formData.get('name'),
    category: formData.get('category'),
  });
  if (!result.ok) {
    return {
      error: result.error === 'INVALID' ? result.message : ADD_MESSAGES[result.error],
    };
  }
  revalidatePath(PATH);
  revalidatePath('/news');
  const { received, added } = result.data;
  return {
    success: `Лента подключена: в ней ${received} записей, на сайт добавлено ${added} свежих новостей.`,
  };
}

/** Отключить ленту вместе с её новостями. */
export async function removeFeedAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(PATH);
  const result = await service.removeFeed(formData.get('id'));
  if (!result.ok) return { error: 'Эта лента уже отключена.' };
  revalidatePath(PATH);
  revalidatePath('/news');
  return null;
}

/** Обновить все ленты сейчас. */
export async function refreshFeedsAction(): Promise<ActionState> {
  await requireAdmin(PATH);
  await service.refreshFeeds();
  revalidatePath(PATH);
  revalidatePath('/news');
  return null;
}

export type PreviewState = { ok: true; preview: RssPreview } | { ok: false; error: string } | null;

const PREVIEW_MESSAGES: Record<service.PreviewError, string> = {
  NO_FILE: 'Выберите файл ленты.',
  TOO_BIG: 'Файл больше 512 КБ — для ленты новостей это слишком много.',
  NOT_A_FEED: 'В файле нет ленты RSS или Atom — или он повреждён.',
};

/** Разобрать загруженный RSS-файл. Входить не нужно: файл никуда не сохраняется. */
export async function previewRssAction(_: PreviewState, formData: FormData): Promise<PreviewState> {
  const result = await service.previewRssFile(formData.get('file'));
  return result.ok
    ? { ok: true, preview: result.data }
    : { ok: false, error: PREVIEW_MESSAGES[result.error] };
}

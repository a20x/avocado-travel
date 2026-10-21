'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import { bannedHostSchema, entryInputSchema, stopWordSchema, type GuestbookError } from '../model';
import * as service from './service';

export type EntryFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'authorName' | 'message', string>>;
  values?: { authorName?: string; message?: string };
};

const MESSAGES: Record<GuestbookError, string> = {
  BANNED_HOST: 'С вашего адреса оставлять записи в гостевой книге нельзя.',
  TOO_MANY_REQUESTS: 'Не чаще одной записи в минуту. Подождите немного и отправьте снова.',
  NOT_FOUND: 'Запись не найдена — возможно, её уже удалили.',
  DUPLICATE: 'Такое значение уже есть в списке.',
};

/** Запись посетителя. Писать может любой, вход не нужен. */
export async function postEntryAction(
  _: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const values = {
    authorName: String(formData.get('authorName') ?? ''),
    message: String(formData.get('message') ?? ''),
  };
  const parsed = entryInputSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: EntryFormState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === 'authorName' || field === 'message') && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, values };
  }

  const result = await service.postEntry(parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };
  // Скрытую из-за запрещённого слова запись автор не увидит в ленте — скажем ему об этом.
  redirect(`/guestbook?posted=${result.data.visible ? 'visible' : 'moderation'}`);
}

/* Админка: права проверяются в каждом action. */

const ENTRIES_PATH = '/admin/guestbook';
const RULES_PATH = '/admin/guestbook/rules';

async function done(
  result: { ok: boolean; error?: GuestbookError },
  path: string,
): Promise<ActionState> {
  if (!result.ok) return { error: MESSAGES[result.error ?? 'NOT_FOUND'] };
  revalidatePath(path);
  return null;
}

export async function hideEntryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(ENTRIES_PATH);
  return done(await service.setEntryVisibility(formData.get('id'), false), ENTRIES_PATH);
}

export async function showEntryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(ENTRIES_PATH);
  return done(await service.setEntryVisibility(formData.get('id'), true), ENTRIES_PATH);
}

export async function deleteEntryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(ENTRIES_PATH);
  const result = await service.deleteEntry(formData.get('id'));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect(`${ENTRIES_PATH}?deleted=1`);
}

/** «Запретить IP» прямо из списка записей. */
export async function banEntryIpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(ENTRIES_PATH);
  const parsed = bannedHostSchema.safeParse({
    pattern: formData.get('ip'),
    comment: 'Запрещён из списка записей',
  });
  if (!parsed.success) return { error: 'У записи нет корректного IP-адреса.' };
  return done(await service.banHost(parsed.data), ENTRIES_PATH);
}

export async function addStopWordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(RULES_PATH);
  const parsed = stopWordSchema.safeParse(formData.get('word') ?? '');
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return done(await service.addStopWord(parsed.data), RULES_PATH);
}

export async function removeStopWordAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin(RULES_PATH);
  return done(await service.removeStopWord(formData.get('id')), RULES_PATH);
}

export async function banHostAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(RULES_PATH);
  const parsed = bannedHostSchema.safeParse({
    pattern: formData.get('pattern') ?? '',
    comment: formData.get('comment') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return done(await service.banHost(parsed.data), RULES_PATH);
}

export async function unbanHostAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(RULES_PATH);
  return done(await service.unbanHost(formData.get('id')), RULES_PATH);
}

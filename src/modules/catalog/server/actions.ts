'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import { linkInputSchema, sectionInputSchema, type CatalogError } from '../model';
import * as service from './service';

const PATH = '/admin/catalog';

const MESSAGES: Record<CatalogError, string> = {
  NOT_FOUND: 'Раздел или ссылка не найдены — возможно, их уже удалили.',
  TOO_DEEP: 'Глубже трёх уровней разделы не вкладываются.',
};

export type CatalogFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  /** Сохранено — форма очищается. */
  saved?: boolean;
};

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>, prefix: string) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    const key = field === 'title' ? `${prefix}Title` : field;
    if (field && !result[key]) result[key] = issue.message;
  }
  return result;
}

/** Каталог меняется — обновляются и админка, и публичная страница. */
function refresh() {
  revalidatePath(PATH);
  revalidatePath('/links');
}

export async function addSectionAction(
  _: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireAdmin(PATH);
  const values = {
    sectionTitle: String(formData.get('sectionTitle') ?? ''),
    parentId: String(formData.get('parentId') ?? ''),
  };
  const parsed = sectionInputSchema.safeParse({
    title: values.sectionTitle,
    parentId: values.parentId,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues, 'section'), values };

  const result = await service.addSection(parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };
  refresh();
  return { saved: true };
}

export async function addLinkAction(
  _: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireAdmin(PATH);
  const values = {
    linkTitle: String(formData.get('linkTitle') ?? ''),
    url: String(formData.get('url') ?? ''),
    description: String(formData.get('description') ?? ''),
    sectionId: String(formData.get('sectionId') ?? ''),
  };
  const parsed = linkInputSchema.safeParse({ ...values, title: values.linkTitle });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues, 'link'), values };

  const result = await service.addLink(parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };
  refresh();
  return { saved: true };
}

async function done(result: { ok: boolean; error?: CatalogError }): Promise<ActionState> {
  if (!result.ok) return { error: MESSAGES[result.error ?? 'NOT_FOUND'] };
  refresh();
  return null;
}

const kindOf = (formData: FormData) => (formData.get('kind') === 'link' ? 'link' : 'section');

export async function hideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(PATH);
  return done(await service.setVisibility(kindOf(formData), formData.get('id'), false));
}

export async function showAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(PATH);
  return done(await service.setVisibility(kindOf(formData), formData.get('id'), true));
}

export async function deleteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin(PATH);
  return done(await service.remove(kindOf(formData), formData.get('id')));
}

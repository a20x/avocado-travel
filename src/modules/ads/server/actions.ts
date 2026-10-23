'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import { campaignInputSchema, type AdError } from '../model';
import * as service from './service';

const PATH = '/admin/ads';

const MESSAGES: Record<AdError, string> = {
  NOT_FOUND: 'Кампания не найдена — возможно, её уже удалили.',
};

export type CampaignFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const FIELDS = ['title', 'text', 'image', 'targetUrl', 'placement', 'startDate', 'endDate'];

/** Создание и правка — одна форма: с `id` — правка, без — новая кампания. */
export async function saveCampaignAction(
  _: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  await requireAdmin(PATH);
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? '')]));
  values.isEnabled = formData.get('isEnabled') === 'on' ? 'on' : '';
  const parsed = campaignInputSchema.safeParse({ ...values, isEnabled: values.isEnabled === 'on' });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  const id = formData.get('id');
  if (id) {
    const result = await service.updateCampaign(id, parsed.data);
    if (!result.ok) return { error: MESSAGES[result.error], values };
  } else {
    await service.createCampaign(parsed.data);
  }
  redirect(`${PATH}?saved=1`);
}

async function done(result: { ok: boolean; error?: AdError }): Promise<ActionState> {
  if (!result.ok) return { error: MESSAGES[result.error ?? 'NOT_FOUND'] };
  revalidatePath(PATH);
  return null;
}

export async function enableCampaignAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin(PATH);
  return done(await service.setEnabled(formData.get('id'), true));
}

export async function disableCampaignAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin(PATH);
  return done(await service.setEnabled(formData.get('id'), false));
}

export async function deleteCampaignAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin(PATH);
  return done(await service.deleteCampaign(formData.get('id')));
}

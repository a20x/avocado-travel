'use server';

import type { ActionState } from '@/shared/ui/ActionForm';
import { cityIdSchema } from '../model';
import * as service from './service';

const MESSAGES: Record<service.SaveCityError, string> = {
  LIMIT: 'Отметить можно до 10 городов — сначала удалите лишний.',
  NOT_FOUND: 'Не удалось найти этот город — попробуйте ещё раз чуть позже.',
};

/**
 * «Добавить в мои города». Входить не нужно: список хранится в cookie браузера.
 * Страница перерисуется сама — Next.js отдаёт её заново после смены cookie.
 */
export async function saveCityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = cityIdSchema.safeParse(formData.get('city'));
  if (!id.success) return { error: MESSAGES.NOT_FOUND };
  const result = await service.saveCity(id.data);
  return result.ok ? null : { error: MESSAGES[result.error] };
}

/** «Удалить из моих городов». */
export async function forgetCityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = cityIdSchema.safeParse(formData.get('city'));
  if (id.success) await service.forgetCity(id.data);
  return null;
}

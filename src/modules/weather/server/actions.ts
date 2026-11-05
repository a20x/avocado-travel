'use server';

import type { ActionState } from '@/shared/ui/ActionForm';
import { HOME_WEATHER_COUNT, cityIdSchema, type HomeCityError } from '../model';
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

const HOME_MESSAGES: Record<HomeCityError, string> = {
  HOME_LIMIT: `На главной уже ${HOME_WEATHER_COUNT} города — сначала уберите один из них.`,
  NOT_SAVED: 'Этого города уже нет в «Моих городах» — добавьте его снова.',
};

/** «На главную» (`home=1`) и «Убрать с главной» (`home=0`) у города из «Моих городов». */
export async function setHomeCityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = cityIdSchema.safeParse(formData.get('city'));
  if (!id.success) return { error: HOME_MESSAGES.NOT_SAVED };
  const result = await service.setHomeCity(id.data, formData.get('home') === '1');
  return result.ok ? null : { error: HOME_MESSAGES[result.error] };
}

'use server';

import { revalidatePath } from 'next/cache';
import { ratingInputSchema, type RatingError } from '../model';
import * as service from './service';

export type RatingFormState = { error?: string };

const MESSAGES: Record<RatingError, string> = {
  ALREADY_RATED: 'Сегодня вы уже оценили сайт. Приходите завтра!',
};

/** Оценка сайта. Входить не нужно: голос привязан к посетителю, а не к аккаунту. */
export async function rateAction(_: RatingFormState, formData: FormData): Promise<RatingFormState> {
  const parsed = ratingInputSchema.safeParse({ score: formData.get('score') ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await service.rate(parsed.data.score);
  if (!result.ok) return { error: MESSAGES[result.error] };
  // Главная перерисуется: вместо формы — «спасибо» и новый средний балл.
  revalidatePath('/');
  return {};
}

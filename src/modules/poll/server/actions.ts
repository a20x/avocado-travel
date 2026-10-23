'use server';

import { revalidatePath } from 'next/cache';
import { voteInputSchema, type PollError } from '../model';
import * as service from './service';

export type VoteFormState = { error?: string };

const MESSAGES: Record<PollError, string> = {
  INVALID_OPTION: 'Этот опрос уже закрыт или вариант не найден. Обновите страницу.',
  ALREADY_VOTED: 'Вы уже голосовали в этом опросе.',
};

/** Голос в опросе. Входить не нужно. */
export async function voteAction(_: VoteFormState, formData: FormData): Promise<VoteFormState> {
  const parsed = voteInputSchema.safeParse({
    pollId: formData.get('pollId') ?? undefined,
    optionId: formData.get('optionId') ?? undefined,
  });
  if (!parsed.success) return { error: 'Выберите вариант ответа' };

  const result = await service.vote(parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error] };
  // Главная перерисуется: вместо формы — результаты.
  revalidatePath('/');
  return {};
}

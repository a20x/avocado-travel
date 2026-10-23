import { z } from 'zod';

export type PollOptionResult = { id: number; text: string; votes: number; percent: number };

/** Активный опрос для показа: варианты с голосами и выбор текущего посетителя. */
export type PollView = {
  id: number;
  question: string;
  options: PollOptionResult[];
  totalVotes: number;
  /** null — посетитель ещё не голосовал: показываем форму, а не результаты. */
  myOptionId: number | null;
};

export const voteInputSchema = z.object({
  pollId: z.coerce.number().int().positive(),
  optionId: z.coerce.number('Выберите вариант ответа').int().positive('Выберите вариант ответа'),
});
export type VoteInput = z.infer<typeof voteInputSchema>;

export type PollError = 'INVALID_OPTION' | 'ALREADY_VOTED';

/**
 * Ключ голосующего (docs/02-product.md, «Опрос»): вошедший пользователь — по аккаунту,
 * гость — по постоянному хэшу IP. Хэш без даты: иначе гость мог бы голосовать каждый день.
 */
export function voterKey(userId: string | null | undefined, ipHash: string): string {
  return userId ? `user:${userId}` : `ip:${ipHash}`;
}

/**
 * Проценты вариантов, в сумме ровно 100: округление вниз, а оставшиеся проценты достаются
 * вариантам с самым большим остатком. Иначе 33 + 33 + 33 дали бы 99.
 */
export function withPercents<T extends { votes: number }>(
  options: T[],
): Array<T & { percent: number }> {
  const total = options.reduce((sum, option) => sum + option.votes, 0);
  if (total === 0) return options.map((option) => ({ ...option, percent: 0 }));

  const exact = options.map((option) => (option.votes / total) * 100);
  const percents = exact.map(Math.floor);
  let left = 100 - percents.reduce((sum, p) => sum + p, 0);
  const byRemainder = exact
    .map((value, i) => ({ i, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    percents[i] = (percents[i] ?? 0) + 1;
    left--;
  }
  return options.map((option, i) => ({ ...option, percent: percents[i] ?? 0 }));
}

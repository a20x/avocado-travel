import { z } from 'zod';

export const SCORES = [1, 2, 3, 4, 5] as const;

/** Средний балл, число оценок и оценка текущего посетителя за сегодня. */
export type RatingSummary = {
  /** null — оценок ещё нет. */
  average: number | null;
  count: number;
  myScore: number | null;
};

export const ratingInputSchema = z.object({
  score: z.coerce
    .number('Выберите оценку от 1 до 5')
    .int('Выберите оценку от 1 до 5')
    .min(1, 'Выберите оценку от 1 до 5')
    .max(5, 'Выберите оценку от 1 до 5'),
});

export type RatingError = 'ALREADY_RATED';

/** «4,6» — средний балл с одним знаком после запятой. */
export function formatAverage(average: number): string {
  return (Math.round(average * 10) / 10).toLocaleString('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Насколько закрашена звезда с номером `star` (с единицы) при среднем балле: от 0 до 1. */
export function starFill(average: number, star: number): number {
  return Math.min(1, Math.max(0, average - (star - 1)));
}

import 'server-only';
import { getVisitor } from '@/server/visitor';
import { fail, ok, type Result } from '@/shared/lib/result';
import type { RatingError, RatingSummary } from '../model';
import * as repository from './repository';

/** Средний балл и оценка текущего посетителя за сегодня. */
export async function getRating(): Promise<RatingSummary> {
  const visitor = await getVisitor();
  const [summary, myScore] = await Promise.all([
    repository.findSummary(),
    repository.findScore(visitor.dailyHash, visitor.day),
  ]);
  return { ...summary, myScore };
}

/** Одна оценка от посетителя в сутки (docs/02-product.md). Оценка уже проверена схемой. */
export async function rate(score: number): Promise<Result<null, RatingError>> {
  const visitor = await getVisitor();
  const saved = await repository.insertRating({
    score,
    visitorHash: visitor.dailyHash,
    day: visitor.day,
  });
  return saved ? ok(null) : fail('ALREADY_RATED');
}

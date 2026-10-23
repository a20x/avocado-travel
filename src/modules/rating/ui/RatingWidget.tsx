import { plural } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { SCORES, formatAverage, starFill, type RatingSummary } from '../model';
import { RatingForm } from './RatingForm';
import { Star } from './Star';

/** Рейтинг сайта (L1-S02): средний балл, число оценок и форма — или «спасибо» за оценку. */
export function RatingWidget({ rating }: { rating: RatingSummary }) {
  return (
    <Card
      as="section"
      aria-labelledby="rating-title"
      className="grid content-start gap-4 p-5 md:p-6"
    >
      <h2 id="rating-title" className="text-xl">
        Оцените сайт
      </h2>
      {rating.average !== null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex">
            {SCORES.map((star) => (
              <Star key={star} fill={starFill(rating.average ?? 0, star)} />
            ))}
          </span>
          <p>
            <b className="text-xl">{formatAverage(rating.average)}</b>
            <span className="sr-only"> из 5</span>
            <span className="text-slate">
              {' '}
              · {rating.count} {plural(rating.count, ['оценка', 'оценки', 'оценок'])}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-slate">Оценок пока нет — будьте первым.</p>
      )}
      {rating.myScore ? (
        <p role="status" className="rounded-sm bg-sage-light px-4 py-3 text-leaf">
          Спасибо! Ваша оценка сегодня — {rating.myScore} из 5.
        </p>
      ) : (
        <RatingForm />
      )}
    </Card>
  );
}

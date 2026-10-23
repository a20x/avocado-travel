import { Card } from '@/shared/ui/Card';
import type { PollView } from '../model';
import { PollForm } from './PollForm';
import { PollResults } from './PollResults';

/** Опрос: форма до голосования, результаты — после (docs/02-product.md). */
export function PollWidget({ poll, permalink = '/' }: { poll: PollView; permalink?: string }) {
  return (
    <Card as="section" aria-labelledby="poll-title" className="grid content-start gap-4 p-5 md:p-6">
      <h2 id="poll-title" className="text-xl">
        Опрос
      </h2>
      {poll.myOptionId === null ? (
        <PollForm
          pollId={poll.id}
          question={poll.question}
          options={poll.options.map(({ id, text }) => ({ id, text }))}
          permalink={permalink}
        />
      ) : (
        <PollResults poll={poll} />
      )}
    </Card>
  );
}

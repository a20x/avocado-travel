import { pollOptions, pollVotes, polls } from '@/modules/poll';
import type { Db } from './db';
import { createRandom } from './schedule';

// Один активный опрос с пятью вариантами и голосами демо-посетителей (docs/04-data-model.md).
const QUESTION = 'Куда вы хотите полететь этой зимой?';

const OPTIONS: Array<[string, number]> = [
  ['К морю — в Сочи или Стамбул', 34],
  ['В Калининград и на Балтику', 22],
  ['На Байкал через Иркутск', 18],
  ['Во Владивосток', 11],
  ['Никуда, буду дома', 15],
];

const VOTES = 240;

export async function seedPoll(db: Db): Promise<number> {
  const random = createRandom(20261024);
  const [poll] = await db
    .insert(polls)
    .values({ question: QUESTION, isActive: true })
    .returning({ id: polls.id });
  if (!poll) throw new Error('Опрос не создан');

  const options = await db
    .insert(pollOptions)
    .values(OPTIONS.map(([text], position) => ({ pollId: poll.id, text, position })))
    .returning({ id: pollOptions.id });

  const votes = Array.from({ length: VOTES }, (_, i) => {
    let point = random() * 100;
    let index = 0;
    while (index < OPTIONS.length - 1 && (point -= OPTIONS[index]?.[1] ?? 0) >= 0) index++;
    const option = options[index];
    if (!option) throw new Error('Нет варианта ответа');
    // Демо-голоса — с ключами, которые не совпадут ни с одним настоящим посетителем.
    return { pollId: poll.id, optionId: option.id, voterKey: `demo:${i}` };
  });
  await db.insert(pollVotes).values(votes);
  return VOTES;
}

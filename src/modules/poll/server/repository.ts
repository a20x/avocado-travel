import 'server-only';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { pollOptions, pollVotes, polls } from '../schema';

/** Активный опрос (самый новый, если активных несколько). */
export async function findActivePoll(): Promise<{ id: number; question: string } | null> {
  const [poll] = await db
    .select({ id: polls.id, question: polls.question })
    .from(polls)
    .where(eq(polls.isActive, true))
    .orderBy(desc(polls.createdAt), desc(polls.id))
    .limit(1);
  return poll ?? null;
}

/** Варианты опроса по порядку с числом голосов. */
export function findOptionsWithVotes(pollId: number) {
  return db
    .select({ id: pollOptions.id, text: pollOptions.text, votes: count(pollVotes.id) })
    .from(pollOptions)
    .leftJoin(pollVotes, eq(pollVotes.optionId, pollOptions.id))
    .where(eq(pollOptions.pollId, pollId))
    .groupBy(pollOptions.id)
    .orderBy(asc(pollOptions.position));
}

export async function findVote(pollId: number, voterKey: string): Promise<number | null> {
  const [vote] = await db
    .select({ optionId: pollVotes.optionId })
    .from(pollVotes)
    .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.voterKey, voterKey)));
  return vote?.optionId ?? null;
}

/** Вариант принадлежит активному опросу — голосовать в закрытом опросе нельзя. */
export async function isActiveOption(pollId: number, optionId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: pollOptions.id })
    .from(pollOptions)
    .innerJoin(polls, eq(polls.id, pollOptions.pollId))
    .where(and(eq(pollOptions.id, optionId), eq(polls.id, pollId), eq(polls.isActive, true)));
  return Boolean(row);
}

/** false — этот посетитель уже голосовал в опросе. */
export async function insertVote(values: {
  pollId: number;
  optionId: number;
  voterKey: string;
}): Promise<boolean> {
  const inserted = await db
    .insert(pollVotes)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: pollVotes.id });
  return inserted.length > 0;
}

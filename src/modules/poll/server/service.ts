import 'server-only';
import { getCurrentUser } from '@/modules/auth/server';
import { getVisitor } from '@/server/visitor';
import { fail, ok, type Result } from '@/shared/lib/result';
import { voterKey, withPercents, type PollError, type PollView, type VoteInput } from '../model';
import * as repository from './repository';

async function currentVoterKey(): Promise<string> {
  const [user, visitor] = await Promise.all([getCurrentUser(), getVisitor()]);
  return voterKey(user?.id, visitor.stableHash);
}

/** Активный опрос с результатами и выбором текущего посетителя, или null. */
export async function getActivePoll(): Promise<PollView | null> {
  const poll = await repository.findActivePoll();
  if (!poll) return null;
  const [options, myOptionId] = await Promise.all([
    repository.findOptionsWithVotes(poll.id),
    currentVoterKey().then((key) => repository.findVote(poll.id, key)),
  ]);
  return {
    ...poll,
    options: withPercents(options),
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    myOptionId,
  };
}

/** Один голос на посетителя (docs/02-product.md). */
export async function vote(input: VoteInput): Promise<Result<null, PollError>> {
  if (!(await repository.isActiveOption(input.pollId, input.optionId))) {
    return fail('INVALID_OPTION');
  }
  const saved = await repository.insertVote({ ...input, voterKey: await currentVoterKey() });
  return saved ? ok(null) : fail('ALREADY_VOTED');
}

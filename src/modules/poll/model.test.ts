import { describe, expect, it } from 'vitest';
import { voteInputSchema, voterKey, withPercents } from './model';

describe('опрос', () => {
  it('вошедший голосует аккаунтом, гость — хэшем IP', () => {
    expect(voterKey('u1', 'abc')).toBe('user:u1');
    expect(voterKey(null, 'abc')).toBe('ip:abc');
    expect(voterKey(undefined, 'abc')).toBe('ip:abc');
  });

  it('без выбранного варианта — ошибка', () => {
    expect(voteInputSchema.parse({ pollId: '1', optionId: '3' })).toEqual({
      pollId: 1,
      optionId: 3,
    });
    expect(voteInputSchema.safeParse({ pollId: '1' }).error?.issues[0]?.message).toBe(
      'Выберите вариант ответа',
    );
  });

  it('проценты в сумме дают ровно 100', () => {
    const percents = withPercents([{ votes: 1 }, { votes: 1 }, { votes: 1 }]).map((o) => o.percent);
    expect(percents.reduce((a, b) => a + b, 0)).toBe(100);
    expect(percents.toSorted()).toEqual([33, 33, 34]);

    expect(withPercents([{ votes: 3 }, { votes: 1 }]).map((o) => o.percent)).toEqual([75, 25]);
  });

  it('без голосов — нули', () => {
    expect(withPercents([{ votes: 0 }, { votes: 0 }]).map((o) => o.percent)).toEqual([0, 0]);
  });
});

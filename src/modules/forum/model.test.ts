import { describe, expect, it } from 'vitest';
import {
  canEditPost,
  editMinutesLeft,
  pageOfPosition,
  postInputSchema,
  topicHref,
  topicInputSchema,
} from './model';

const createdAt = new Date('2026-10-21T10:00:00Z');
const after = (minutes: number) => new Date(createdAt.getTime() + minutes * 60_000);

describe('правка сообщения', () => {
  const post = { authorId: 'anna', createdAt };

  it('автор может править первые 15 минут', () => {
    expect(canEditPost(post, 'anna', after(0))).toBe(true);
    expect(canEditPost(post, 'anna', after(14.9))).toBe(true);
    expect(canEditPost(post, 'anna', after(15))).toBe(false);
  });

  it('чужое сообщение и гость — нельзя', () => {
    expect(canEditPost(post, 'boris', after(1))).toBe(false);
    expect(canEditPost(post, null, after(1))).toBe(false);
  });

  it('оставшиеся минуты округляются вверх', () => {
    expect(editMinutesLeft(createdAt, after(0))).toBe(15);
    expect(editMinutesLeft(createdAt, after(10.5))).toBe(5);
    expect(editMinutesLeft(createdAt, after(14.99))).toBe(1);
  });
});

describe('страницы темы', () => {
  it('номер страницы по порядковому номеру сообщения', () => {
    expect(pageOfPosition(1, 10)).toBe(1);
    expect(pageOfPosition(10, 10)).toBe(1);
    expect(pageOfPosition(11, 10)).toBe(2);
    expect(pageOfPosition(0, 10)).toBe(1);
  });

  it('первая страница — без параметра', () => {
    expect(topicHref('t1')).toBe('/forum/t1');
    expect(topicHref('t1', 1)).toBe('/forum/t1');
    expect(topicHref('t1', 3)).toBe('/forum/t1?page=3');
  });
});

describe('формы форума', () => {
  it('сообщение обрезается по краям, пустое — ошибка', () => {
    expect(postInputSchema.parse({ body: '  Привет!\nКак дела?  ' }).body).toBe(
      'Привет!\nКак дела?',
    );
    expect(postInputSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(postInputSchema.safeParse({ body: 'а'.repeat(5001) }).success).toBe(false);
  });

  it('заголовок темы — от 5 до 120 символов', () => {
    expect(topicInputSchema.safeParse({ title: 'Багаж', body: 'Текст' }).success).toBe(true);
    const result = topicInputSchema.safeParse({ title: 'Ой', body: '' });
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(['body', 'title']);
    expect(topicInputSchema.safeParse({ title: 'а'.repeat(121), body: 'Текст' }).success).toBe(
      false,
    );
  });
});

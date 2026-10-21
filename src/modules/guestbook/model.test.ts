import { describe, expect, it } from 'vitest';
import {
  bannedHostSchema,
  entryInputSchema,
  findStopWord,
  normalizeText,
  stopWordSchema,
} from './model';

describe('запрещённые слова', () => {
  const words = ['спам', 'плохое выражение'];

  it('находит слово без учёта регистра и «ё»', () => {
    expect(findStopWord('Купите СПАМ недорого', words)).toBe('спам');
    expect(findStopWord('Тут   ПЛОХОЕ\nвыражение!', words)).toBe('плохое выражение');
    expect(findStopWord('Ёлки', ['елки'])).toBe('елки');
  });

  it('не срабатывает на часть другого слова', () => {
    expect(findStopWord('Летали бизнес-классом', ['ласс'])).toBeNull();
    expect(findStopWord('Спамер', words)).toBeNull();
    expect(findStopWord('Всё отлично', words)).toBeNull();
  });

  it('спецсимволы в слове не ломают поиск', () => {
    expect(findStopWord('цена (дёшево)', ['(дешево)'])).toBe('(дешево)');
    expect(findStopWord('цена дешево', ['(дешево)'])).toBeNull();
    expect(findStopWord('я+ты', ['я+ты'])).toBe('я+ты');
  });

  it('слово хранится нормализованным', () => {
    expect(stopWordSchema.parse('  Ёжик  ')).toBe('ежик');
    expect(normalizeText(' A  B ')).toBe('a b');
  });
});

describe('форма записи', () => {
  it('имя до 50 символов, сообщение до 2000', () => {
    expect(entryInputSchema.safeParse({ authorName: 'Анна', message: 'Спасибо!' }).success).toBe(
      true,
    );
    expect(entryInputSchema.safeParse({ authorName: 'А'.repeat(51), message: 'x' }).success).toBe(
      false,
    );
    expect(entryInputSchema.safeParse({ authorName: 'А', message: 'x'.repeat(2001) }).success).toBe(
      false,
    );
    expect(entryInputSchema.safeParse({ authorName: '  ', message: 'x' }).success).toBe(false);
  });
});

describe('запрещённые хосты', () => {
  it('IP или подсеть v4 и v6', () => {
    for (const pattern of ['203.0.113.7', '203.0.113.0/24', '2001:db8::1', '2001:db8::/32']) {
      expect(bannedHostSchema.safeParse({ pattern, comment: '' }).success).toBe(true);
    }
    expect(bannedHostSchema.safeParse({ pattern: 'example.com', comment: '' }).success).toBe(false);
    expect(bannedHostSchema.safeParse({ pattern: '300.1.1.1', comment: '' }).success).toBe(false);
  });
});

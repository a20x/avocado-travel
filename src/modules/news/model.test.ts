import { describe, expect, it } from 'vitest';
import { newsInputSchema, splitParagraphs } from './model';

const valid = {
  title: 'Новые рейсы в Казань',
  slug: '',
  summary: 'С декабря летаем в Казань трижды в день.',
  body: 'Первый абзац новости.\n\nВторой абзац новости.',
  category: 'routes',
  publishedDate: '2026-10-21',
  publishedTime: '10:00',
};

describe('форма новости', () => {
  it('принимает корректную новость; пустой адрес допустим', () => {
    expect(newsInputSchema.safeParse(valid).success).toBe(true);
  });

  it('адрес — только латиница, цифры и дефисы; приводится к нижнему регистру', () => {
    expect(newsInputSchema.parse({ ...valid, slug: 'Kazan-2026' }).slug).toBe('kazan-2026');
    expect(newsInputSchema.safeParse({ ...valid, slug: 'казань' }).success).toBe(false);
    expect(newsInputSchema.safeParse({ ...valid, slug: 'a--b' }).success).toBe(false);
  });

  it('неизвестная рубрика и короткий заголовок — ошибки', () => {
    const result = newsInputSchema.safeParse({ ...valid, category: 'other', title: 'Ой' });
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'category',
      'title',
    ]);
  });
});

describe('абзацы текста', () => {
  it('делит по пустой строке, переносы внутри абзаца — пробел', () => {
    expect(splitParagraphs('Раз\nдва.\n\n\nТри.\n  \nЧетыре.')).toEqual([
      'Раз два.',
      'Три.',
      'Четыре.',
    ]);
    expect(splitParagraphs('   ')).toEqual([]);
  });
});

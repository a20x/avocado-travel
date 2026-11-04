import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import pressFile from '../../../content/press/press-releases.json';
import pressSchema from '../../../content/press/press-releases.schema.json';
import {
  parsePressFile,
  pressParagraphs,
  pressReleaseSchema,
  pressSearchDocuments,
  type PressRelease,
} from './model';

const release = (overrides: Partial<PressRelease>): PressRelease => ({
  id: 'pr-001',
  title: 'Заголовок пресс-релиза',
  date: '2026-05-01',
  category: 'company',
  author: 'Анна Белова',
  summary: 'Краткое содержание пресс-релиза для списка.',
  body: 'Первый абзац текста пресс-релиза.\n\nВторой абзац текста пресс-релиза.',
  ...overrides,
});

describe('файл content/press/press-releases.json', () => {
  it('проходит проверку схемой: 18 релизов, 7 полей у каждого', () => {
    const releases = parsePressFile(pressFile);
    expect(releases).toHaveLength(18);
    for (const item of releases) expect(Object.keys(item)).toHaveLength(7);
  });

  it('JSON Schema и Zod-схема описывают одни и те же поля и категории', () => {
    const fromZod = z.toJSONSchema(pressReleaseSchema) as {
      properties: Record<string, { enum?: string[] }>;
      required: string[];
    };
    const fromFile = pressSchema.$defs.release;
    expect(Object.keys(fromFile.properties).sort()).toEqual(Object.keys(fromZod.properties).sort());
    expect([...fromFile.required].sort()).toEqual([...fromZod.required].sort());
    expect(fromFile.properties.category.enum).toEqual(fromZod.properties.category?.enum);
    expect(fromFile.properties.id.pattern).toBe('^pr-\\d{3}$');
  });
});

describe('parsePressFile', () => {
  const file = (releases: unknown[]) => ({ releases });
  const many = Array.from({ length: 15 }, (_, i) =>
    release({ id: `pr-${String(i + 1).padStart(3, '0')}` }),
  );

  it('принимает корректный файл', () => {
    expect(parsePressFile(file(many))).toHaveLength(15);
  });

  it('отклоняет меньше 15 записей, повтор id, лишнее поле и неизвестную категорию', () => {
    expect(() => parsePressFile(file(many.slice(1)))).toThrow();
    expect(() => parsePressFile(file([...many.slice(1), many[0], many[0]]))).toThrow(/повторяются/);
    expect(() => parsePressFile(file([...many.slice(1), { ...many[0], tags: [] }]))).toThrow();
    expect(() => parsePressFile(file([...many.slice(1), { ...many[0], category: 'x' }]))).toThrow();
  });
});

describe('pressParagraphs', () => {
  it('делит текст на абзацы по пустой строке, лишние пробелы убирает', () => {
    expect(pressParagraphs('Первый.\n\n  Второй.  \n \nТретий.')).toEqual([
      'Первый.',
      'Второй.',
      'Третий.',
    ]);
  });
});

describe('pressSearchDocuments', () => {
  it('релиз ведёт к своей строке на вкладке «XML» по якорю', () => {
    expect(pressSearchDocuments([release({})])[0]).toMatchObject({
      kind: 'page',
      refId: 'press:pr-001',
      url: '/xml#pr-001',
      title: 'Пресс-релиз: Заголовок пресс-релиза',
    });
  });
});

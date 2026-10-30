import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import pressFile from '../../../content/press/press-releases.json';
import pressSchema from '../../../content/press/press-releases.schema.json';
import {
  buildPressView,
  parsePressFile,
  pressQuerySchema,
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

const RELEASES = [
  release({
    id: 'pr-001',
    title: 'Ереван',
    date: '2026-03-01',
    category: 'routes',
    author: 'Дмитрий Орлов',
  }),
  release({ id: 'pr-002', title: 'Багаж', date: '2026-05-01', category: 'partners' }),
  release({ id: 'pr-003', title: 'Анонс', date: '2026-04-01', category: 'routes' }),
];

const view = (params: Record<string, unknown>) =>
  buildPressView(RELEASES, pressQuerySchema.parse(params));
const ids = (params: Record<string, unknown>) => view(params).items.map((item) => item.id);

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

describe('buildPressView', () => {
  it('по умолчанию — все релизы, сначала новые', () => {
    expect(ids({})).toEqual(['pr-002', 'pr-003', 'pr-001']);
    expect(ids({ sort: 'old' })).toEqual(['pr-001', 'pr-003', 'pr-002']);
  });

  it('сортирует по заголовку и по категории (внутри категории — новые сверху)', () => {
    expect(ids({ sort: 'title' })).toEqual(['pr-003', 'pr-002', 'pr-001']);
    // «Новые направления» < «Партнёры» по алфавиту.
    expect(ids({ sort: 'category' })).toEqual(['pr-003', 'pr-001', 'pr-002']);
  });

  it('выбирает по категории и автору, условия складываются', () => {
    expect(ids({ category: 'routes' })).toEqual(['pr-003', 'pr-001']);
    expect(ids({ author: 'Дмитрий Орлов' })).toEqual(['pr-001']);
    expect(ids({ category: 'partners', author: 'Дмитрий Орлов' })).toEqual([]);
  });

  it('непонятные параметры не применяются', () => {
    const result = view({ sort: 'price', category: 'x', author: 'Неизвестный автор' });
    expect(result.query).toEqual({ sort: 'new', category: undefined, author: undefined });
    expect(result.items).toHaveLength(3);
    expect(view({ sort: ['title', 'old'] }).query.sort).toBe('title');
  });

  it('готовит подписи, абзацы и счётчики для фильтров', () => {
    const result = view({});
    expect(result.items[0]).toMatchObject({
      categoryLabel: 'Партнёры',
      paragraphs: ['Первый абзац текста пресс-релиза.', 'Второй абзац текста пресс-релиза.'],
    });
    expect(result.items[0]?.dateLabel.replace(/\s/g, ' ')).toBe('1 мая 2026 г.');
    expect(result.categories.find((item) => item.value === 'routes')?.count).toBe(2);
    expect(result.categories.find((item) => item.value === 'service')?.count).toBe(0);
    // Выпадающий список — по алфавиту.
    expect(result.categories.map((item) => item.label)).toEqual([
      'Итоги и цифры',
      'Новые направления',
      'О компании',
      'Партнёры',
      'Сервис',
    ]);
    expect(result.authors).toEqual([
      { value: 'Анна Белова', label: 'Анна Белова', count: 2 },
      { value: 'Дмитрий Орлов', label: 'Дмитрий Орлов', count: 1 },
    ]);
  });
});

describe('pressSearchDocuments', () => {
  it('релиз ведёт к себе по якорю', () => {
    expect(pressSearchDocuments([release({})])[0]).toMatchObject({
      kind: 'page',
      refId: 'press:pr-001',
      url: '/press#pr-001',
      title: 'Пресс-релиз: Заголовок пресс-релиза',
    });
  });
});

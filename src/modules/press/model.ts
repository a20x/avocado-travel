import { z } from 'zod';
import type { SearchDocumentInput } from '@/modules/search';

/** Категории пресс-релизов: значение в JSON → подпись на странице. */
export const PRESS_CATEGORIES = {
  routes: 'Новые направления',
  service: 'Сервис',
  partners: 'Партнёры',
  results: 'Итоги и цифры',
  company: 'О компании',
} as const;
export type PressCategory = keyof typeof PRESS_CATEGORIES;

const categoryKeys = Object.keys(PRESS_CATEGORIES) as [PressCategory, ...PressCategory[]];

/**
 * Пресс-релиз — те же правила, что в content/press/press-releases.schema.json (L2-02).
 * Совпадение двух описаний проверяет тест model.test.ts.
 */
export const pressReleaseSchema = z.strictObject({
  id: z.string().regex(/^pr-\d{3}$/),
  title: z.string().min(10).max(120),
  date: z.iso.date(),
  category: z.enum(categoryKeys),
  author: z.string().min(2).max(60),
  summary: z.string().min(20).max(300),
  body: z.string().min(50),
});
export type PressRelease = z.infer<typeof pressReleaseSchema>;

/** Файл целиком: ссылка на схему и 15–20 релизов с неповторяющимися id. */
export const pressFileSchema = z.strictObject({
  $schema: z.string().optional(),
  releases: z
    .array(pressReleaseSchema)
    .min(15)
    .max(20)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
      message: 'Идентификаторы пресс-релизов повторяются',
    }),
});

/**
 * Данные файла, проверенные схемой. Ошибка в файле — исключение с понятным списком
 * проблем: страница не покажет кривые данные молча.
 */
export function parsePressFile(data: unknown): PressRelease[] {
  const parsed = pressFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Ошибка в content/press/press-releases.json:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data.releases;
}

/** Абзацы текста релиза: в файле они разделены пустой строкой. */
export function pressParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * Документы поискового индекса: релиз ищется по заголовку и тексту и ведёт к своей строке
 * в таблице вкладки «XML» по якорю (отдельной страницы «Пресс-центр» больше нет, Этап 12).
 * Все документы — с префиксом `press`: при запуске сервера раздел заменяется целиком.
 */
export const PRESS_REF_PREFIX = 'press';
export function pressSearchDocuments(releases: PressRelease[]): SearchDocumentInput[] {
  return releases.map((release) => ({
    kind: 'page',
    refId: `${PRESS_REF_PREFIX}:${release.id}`,
    url: `/xml#${release.id}`,
    title: `Пресс-релиз: ${release.title}`,
    body: `${release.summary}\n\n${release.body}`,
    visibleFrom: null,
  }));
}

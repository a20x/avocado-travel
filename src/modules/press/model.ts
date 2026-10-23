import { z } from 'zod';
import type { SearchDocumentInput } from '@/modules/search';
import { formatDate } from '@/shared/lib/format';

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

/** Сортировки списка (L2-04). */
export const PRESS_SORTS = {
  new: 'Сначала новые',
  old: 'Сначала старые',
  title: 'По заголовку',
  category: 'По категории',
} as const;
export type PressSort = keyof typeof PRESS_SORTS;

/** Параметр адреса: строка или ничего — повтор и мусор отбрасываются. */
const param = z.preprocess((value) => (Array.isArray(value) ? value[0] : value), z.string());

/**
 * Параметры страницы из адреса: `/press?sort=title&category=routes&author=…`.
 * Непонятное значение не ломает страницу, а просто не применяется.
 */
export const pressQuerySchema = z.object({
  sort: param.pipe(z.enum(Object.keys(PRESS_SORTS) as [PressSort, ...PressSort[]])).catch('new'),
  category: param.pipe(z.enum(categoryKeys)).optional().catch(undefined),
  author: param.pipe(z.string().trim().min(1).max(60)).optional().catch(undefined),
});
export type PressQuery = z.infer<typeof pressQuerySchema>;

/** Пресс-релиз в виде для показа: подписи и абзацы готовы, компоненту остаётся разметка. */
export type PressItemView = {
  id: string;
  title: string;
  /** Для `<time dateTime>`. */
  date: string;
  dateLabel: string;
  category: PressCategory;
  categoryLabel: string;
  author: string;
  summary: string;
  paragraphs: string[];
};

export type PressFacet = { value: string; label: string; count: number };

export type PressView = {
  items: PressItemView[];
  /** Сколько релизов всего в файле. */
  total: number;
  /** Применённые параметры: автор, которого нет в данных, сюда не попадает. */
  query: PressQuery;
  categories: PressFacet[];
  authors: PressFacet[];
};

const byTitle = (a: PressRelease, b: PressRelease) => a.title.localeCompare(b.title, 'ru');
const newestFirst = (a: PressRelease, b: PressRelease) =>
  b.date.localeCompare(a.date) || a.id.localeCompare(b.id);

const COMPARE: Record<PressSort, (a: PressRelease, b: PressRelease) => number> = {
  new: newestFirst,
  old: (a, b) => -newestFirst(a, b),
  title: (a, b) => byTitle(a, b) || newestFirst(a, b),
  category: (a, b) =>
    PRESS_CATEGORIES[a.category].localeCompare(PRESS_CATEGORIES[b.category], 'ru') ||
    newestFirst(a, b),
};

function toItemView(release: PressRelease): PressItemView {
  return {
    id: release.id,
    title: release.title,
    date: release.date,
    dateLabel: formatDate(release.date, { year: true }),
    category: release.category,
    categoryLabel: PRESS_CATEGORIES[release.category],
    author: release.author,
    summary: release.summary,
    paragraphs: release.body
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  };
}

/** Сколько релизов у каждого значения поля — для подписей фильтров «Сервис (4)». */
function countBy(releases: PressRelease[], key: (release: PressRelease) => string) {
  const counts = new Map<string, number>();
  for (const release of releases) counts.set(key(release), (counts.get(key(release)) ?? 0) + 1);
  return counts;
}

/**
 * Преобразователь «данные → модель отображения» (L2-03, аналог XSL-шаблона): выборка
 * по категории и автору, сортировка, подписи и абзацы. Чистая функция — React-компоненты
 * только раскладывают готовую модель по разметке.
 */
export function buildPressView(releases: PressRelease[], requested: PressQuery): PressView {
  const authorCounts = countBy(releases, (release) => release.author);
  const categoryCounts = countBy(releases, (release) => release.category);
  const query: PressQuery = {
    ...requested,
    author: requested.author && authorCounts.has(requested.author) ? requested.author : undefined,
  };

  const items = releases
    .filter((release) => !query.category || release.category === query.category)
    .filter((release) => !query.author || release.author === query.author)
    .sort(COMPARE[query.sort])
    .map(toItemView);

  return {
    items,
    total: releases.length,
    query,
    categories: categoryKeys.map((key) => ({
      value: key,
      label: PRESS_CATEGORIES[key],
      count: categoryCounts.get(key) ?? 0,
    })),
    authors: [...authorCounts]
      .map(([name, count]) => ({ value: name, label: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru')),
  };
}

/** Документы поискового индекса: релиз ищется по заголовку и тексту и ведёт к себе по якорю. */
export function pressSearchDocuments(releases: PressRelease[]): SearchDocumentInput[] {
  return releases.map((release) => ({
    kind: 'page',
    refId: `press:${release.id}`,
    url: `/press#${release.id}`,
    title: `Пресс-релиз: ${release.title}`,
    body: `${release.summary}\n\n${release.body}`,
    visibleFrom: null,
  }));
}

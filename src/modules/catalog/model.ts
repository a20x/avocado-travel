import { z } from 'zod';
import type { catalogLinks, catalogSections } from './schema';

export type CatalogSection = typeof catalogSections.$inferSelect;
export type CatalogLink = typeof catalogLinks.$inferSelect;

/** Раздел с подразделами и ссылками. */
export type CatalogNode = CatalogSection & { links: CatalogLink[]; children: CatalogNode[] };

/** Сколько уровней может быть в дереве: раздел → подраздел → подподраздел. */
export const MAX_DEPTH = 3;

const byPosition = (a: { position: number; id: number }, b: { position: number; id: number }) =>
  a.position - b.position || a.id - b.id;

/** Собирает дерево из плоских списков разделов и ссылок. */
export function buildTree(sections: CatalogSection[], links: CatalogLink[]): CatalogNode[] {
  const nodes = new Map<number, CatalogNode>(
    sections.map((section) => [section.id, { ...section, links: [], children: [] }]),
  );
  for (const link of links) nodes.get(link.sectionId)?.links.push(link);

  const roots: CatalogNode[] = [];
  for (const node of nodes.values()) {
    node.links.sort(byPosition);
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
    (parent ? parent.children : roots).push(node);
  }
  for (const node of nodes.values()) node.children.sort(byPosition);
  return roots.sort(byPosition);
}

/**
 * Дерево для посетителей (docs/02-product.md): скрытый раздел скрывает всё своё поддерево,
 * скрытые ссылки не видны, а разделы, где не осталось ничего видимого, не показываются.
 */
export function publicTree(tree: CatalogNode[]): CatalogNode[] {
  return tree.flatMap((node) => {
    if (!node.isVisible) return [];
    const links = node.links.filter((link) => link.isVisible);
    const children = publicTree(node.children);
    return links.length > 0 || children.length > 0 ? [{ ...node, links, children }] : [];
  });
}

/** Ссылок в дереве. */
export function countLinks(tree: CatalogNode[]): number {
  return tree.reduce((sum, node) => sum + node.links.length + countLinks(node.children), 0);
}

/** Разделы списком с отступами по вложенности — для выпадающих списков формы. */
export function flattenSections(
  tree: CatalogNode[],
  depth = 1,
): Array<{ id: number; title: string; depth: number }> {
  return tree.flatMap((node) => [
    { id: node.id, title: node.title, depth },
    ...flattenSections(node.children, depth + 1),
  ]);
}

/** Уровень раздела (1 — верхний) или null, если раздела нет. */
export function depthOf(sections: Array<Pick<CatalogSection, 'id' | 'parentId'>>, id: number) {
  const byId = new Map(sections.map((section) => [section.id, section]));
  let depth = 0;
  for (let current = byId.get(id); current; current = byId.get(current.parentId ?? -1)) {
    depth++;
    if (depth > sections.length) return null; // защита от цикла в испорченных данных
  }
  return depth === 0 ? null : depth;
}

/** «www.svo.aero/ru/» → «svo.aero» — подпись под ссылкой. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const title = z
  .string()
  .trim()
  .min(2, 'Название — от 2 символов')
  .max(100, 'Название — до 100 символов');

const optionalId = z
  .string()
  .transform((value) => (value === '' ? null : Number(value)))
  .pipe(z.number().int().positive().nullable());

export const sectionInputSchema = z.object({ title, parentId: optionalId });
export type SectionInput = z.infer<typeof sectionInputSchema>;

export const linkInputSchema = z.object({
  title,
  url: z
    .string()
    .trim()
    .max(500, 'Адрес — до 500 символов')
    .pipe(z.url({ protocol: /^https?$/, error: 'Нужен адрес сайта: https://…' })),
  description: z.string().trim().max(300, 'Описание — до 300 символов'),
  sectionId: z.coerce.number('Выберите раздел').int().positive('Выберите раздел'),
});
export type LinkInput = z.infer<typeof linkInputSchema>;

export type CatalogError = 'NOT_FOUND' | 'TOO_DEEP';

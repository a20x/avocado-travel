import 'server-only';
import { eq, isNull, max } from 'drizzle-orm';
import { db } from '@/server/db';
import type { CatalogLink, CatalogSection } from '../model';
import { catalogLinks, catalogSections } from '../schema';

export async function findAll(): Promise<{ sections: CatalogSection[]; links: CatalogLink[] }> {
  const [sections, links] = await Promise.all([
    db.select().from(catalogSections),
    db.select().from(catalogLinks),
  ]);
  return { sections, links };
}

export function findSectionParents(): Promise<Array<Pick<CatalogSection, 'id' | 'parentId'>>> {
  return db
    .select({ id: catalogSections.id, parentId: catalogSections.parentId })
    .from(catalogSections);
}

/** Новый раздел — в конец своего уровня. */
export async function insertSection(values: { title: string; parentId: number | null }) {
  const [last] = await db
    .select({ position: max(catalogSections.position) })
    .from(catalogSections)
    .where(
      values.parentId === null
        ? isNull(catalogSections.parentId)
        : eq(catalogSections.parentId, values.parentId),
    );
  await db.insert(catalogSections).values({ ...values, position: (last?.position ?? 0) + 1 });
}

/** Новая ссылка — в конец раздела. */
export async function insertLink(values: {
  title: string;
  url: string;
  description: string;
  sectionId: number;
}) {
  const [last] = await db
    .select({ position: max(catalogLinks.position) })
    .from(catalogLinks)
    .where(eq(catalogLinks.sectionId, values.sectionId));
  await db.insert(catalogLinks).values({ ...values, position: (last?.position ?? 0) + 1 });
}

export async function setSectionVisibility(id: number, isVisible: boolean): Promise<boolean> {
  const rows = await db
    .update(catalogSections)
    .set({ isVisible })
    .where(eq(catalogSections.id, id))
    .returning({ id: catalogSections.id });
  return rows.length > 0;
}

export async function setLinkVisibility(id: number, isVisible: boolean): Promise<boolean> {
  const rows = await db
    .update(catalogLinks)
    .set({ isVisible })
    .where(eq(catalogLinks.id, id))
    .returning({ id: catalogLinks.id });
  return rows.length > 0;
}

/** Раздел вместе с подразделами и ссылками (каскадом). */
export async function deleteSection(id: number): Promise<boolean> {
  const rows = await db
    .delete(catalogSections)
    .where(eq(catalogSections.id, id))
    .returning({ id: catalogSections.id });
  return rows.length > 0;
}

export async function deleteLink(id: number): Promise<boolean> {
  const rows = await db
    .delete(catalogLinks)
    .where(eq(catalogLinks.id, id))
    .returning({ id: catalogLinks.id });
  return rows.length > 0;
}

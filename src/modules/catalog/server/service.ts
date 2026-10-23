import 'server-only';
import { z } from 'zod';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  MAX_DEPTH,
  buildTree,
  depthOf,
  publicTree,
  type CatalogError,
  type CatalogNode,
  type LinkInput,
  type SectionInput,
} from '../model';
import * as repository from './repository';

const parseId = (id: unknown) => z.coerce.number().int().positive().safeParse(id);

/** Каталог для посетителей: только видимое (docs/02-product.md, «Каталог ресурсов»). */
export async function getPublicCatalog(): Promise<CatalogNode[]> {
  const { sections, links } = await repository.findAll();
  return publicTree(buildTree(sections, links));
}

/* Админка. Права проверяет action, который вызывает эти функции. */

/** Весь каталог, включая скрытое. */
export async function getCatalogForAdmin(): Promise<CatalogNode[]> {
  const { sections, links } = await repository.findAll();
  return buildTree(sections, links);
}

export async function addSection(input: SectionInput): Promise<Result<null, CatalogError>> {
  if (input.parentId !== null) {
    const depth = depthOf(await repository.findSectionParents(), input.parentId);
    if (depth === null) return fail('NOT_FOUND');
    if (depth >= MAX_DEPTH) return fail('TOO_DEEP');
  }
  await repository.insertSection(input);
  return ok(null);
}

export async function addLink(input: LinkInput): Promise<Result<null, CatalogError>> {
  const sections = await repository.findSectionParents();
  if (!sections.some((section) => section.id === input.sectionId)) return fail('NOT_FOUND');
  await repository.insertLink(input);
  return ok(null);
}

export async function setVisibility(
  kind: 'section' | 'link',
  id: unknown,
  visible: boolean,
): Promise<Result<null, CatalogError>> {
  const parsed = parseId(id);
  if (!parsed.success) return fail('NOT_FOUND');
  const done =
    kind === 'section'
      ? await repository.setSectionVisibility(parsed.data, visible)
      : await repository.setLinkVisibility(parsed.data, visible);
  return done ? ok(null) : fail('NOT_FOUND');
}

export async function remove(
  kind: 'section' | 'link',
  id: unknown,
): Promise<Result<null, CatalogError>> {
  const parsed = parseId(id);
  if (!parsed.success) return fail('NOT_FOUND');
  const done =
    kind === 'section'
      ? await repository.deleteSection(parsed.data)
      : await repository.deleteLink(parsed.data);
  return done ? ok(null) : fail('NOT_FOUND');
}

import { describe, expect, it } from 'vitest';
import {
  buildTree,
  countLinks,
  depthOf,
  flattenSections,
  hostOf,
  linkInputSchema,
  publicTree,
  sectionInputSchema,
  type CatalogLink,
  type CatalogSection,
} from './model';

const section = (id: number, parentId: number | null, isVisible = true, position = id) =>
  ({ id, parentId, title: `Раздел ${id}`, position, isVisible }) satisfies CatalogSection;
const link = (id: number, sectionId: number, isVisible = true) =>
  ({
    id,
    sectionId,
    title: `Ссылка ${id}`,
    url: `https://example.com/${id}`,
    description: '',
    position: id,
    isVisible,
  }) satisfies CatalogLink;

describe('дерево каталога', () => {
  it('собирает разделы в дерево по порядку', () => {
    const tree = buildTree(
      [section(1, null, true, 2), section(2, null, true, 1), section(3, 1)],
      [link(1, 3), link(2, 1)],
    );
    expect(tree.map((n) => n.id)).toEqual([2, 1]);
    expect(tree[1]?.children[0]?.links.map((l) => l.id)).toEqual([1]);
    expect(countLinks(tree)).toBe(2);
  });

  it('скрытый раздел скрывает всё поддерево, пустые разделы не видны', () => {
    const tree = buildTree(
      [section(1, null), section(2, 1, false), section(3, 2), section(4, null), section(5, null)],
      [link(1, 1), link(2, 3), link(3, 4, false)],
    );
    const visible = publicTree(tree);
    // Раздел 2 скрыт вместе с разделом 3; в разделе 4 только скрытая ссылка; раздел 5 пуст.
    expect(visible.map((n) => n.id)).toEqual([1]);
    expect(visible[0]?.children).toEqual([]);
    expect(countLinks(visible)).toBe(1);
  });

  it('раздел остаётся, если ссылки есть только в подразделе', () => {
    const tree = buildTree([section(1, null), section(2, 1)], [link(1, 2)]);
    expect(publicTree(tree)[0]?.children.map((n) => n.id)).toEqual([2]);
  });

  it('список разделов с уровнями и уровень раздела', () => {
    const sections = [section(1, null), section(2, 1), section(3, 2)];
    expect(flattenSections(buildTree(sections, [])).map((s) => [s.id, s.depth])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(depthOf(sections, 3)).toBe(3);
    expect(depthOf(sections, 1)).toBe(1);
    expect(depthOf(sections, 99)).toBeNull();
  });
});

describe('формы каталога', () => {
  it('ссылка — только адрес сайта http или https', () => {
    const valid = {
      title: 'Шереметьево',
      url: 'https://svo.aero',
      description: '',
      sectionId: '1',
    };
    expect(linkInputSchema.parse(valid).sectionId).toBe(1);
    expect(linkInputSchema.safeParse({ ...valid, url: 'javascript:alert(1)' }).success).toBe(false);
    expect(linkInputSchema.safeParse({ ...valid, url: 'svo.aero' }).success).toBe(false);
    expect(linkInputSchema.safeParse({ ...valid, sectionId: '' }).success).toBe(false);
  });

  it('раздел без родителя — верхнего уровня', () => {
    expect(sectionInputSchema.parse({ title: 'Аэропорты', parentId: '' }).parentId).toBeNull();
    expect(sectionInputSchema.parse({ title: 'Аэропорты', parentId: '4' }).parentId).toBe(4);
  });

  it('подпись — хост без www', () => {
    expect(hostOf('https://www.svo.aero/ru/')).toBe('svo.aero');
  });
});

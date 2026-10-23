/**
 * Модуль catalog: каталог полезных ресурсов — дерево разделов со ссылками (L1-07, L1-S11).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/catalog/server`,
 * компоненты — в `@/modules/catalog/ui` (ADR-0008).
 */
export { catalogLinks, catalogSections } from './schema';
export {
  MAX_DEPTH,
  buildTree,
  countLinks,
  depthOf,
  flattenSections,
  hostOf,
  linkInputSchema,
  publicTree,
  sectionInputSchema,
} from './model';
export type {
  CatalogError,
  CatalogLink,
  CatalogNode,
  CatalogSection,
  LinkInput,
  SectionInput,
} from './model';

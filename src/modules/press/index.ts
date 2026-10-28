/**
 * Модуль press: пресс-релизы из JSON-файла с сортировкой и выборкой (лаба 2) и те же записи
 * в XML со схемой XSD и преобразованием XSL — вкладка «XML» (ADR-0010).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/press/server`,
 * компоненты — в `@/modules/press/ui` (ADR-0008). Базы у модуля нет: данные — файлы
 * content/press/press-releases.json и press-releases.xml.
 */
export {
  PRESS_CATEGORIES,
  PRESS_SORTS,
  buildPressView,
  parsePressFile,
  pressFileSchema,
  pressQuerySchema,
  pressReleaseSchema,
  pressSearchDocuments,
} from './model';
export {
  PRESS_XML_FILES,
  XML_COLUMNS,
  XML_ORDERS,
  buildXmlTable,
  parsePressXml,
  pressToXml,
  xmlHref,
  xmlQuerySchema,
} from './xml';
export type { XmlColumn, XmlOrder, XmlQuery, XmlRow, XmlTableView } from './xml';
export type {
  PressCategory,
  PressFacet,
  PressItemView,
  PressQuery,
  PressRelease,
  PressSort,
  PressView,
} from './model';

/**
 * Модуль press: пресс-релизы (лаба 2) — вкладка «XML»: XML-файл со схемой XSD и
 * преобразованием XSL, тот же набор в JSON со схемой JSON Schema (ADR-0010, Этап 12).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/press/server`,
 * компоненты — в `@/modules/press/ui` (ADR-0008). Базы у модуля нет: данные — файлы
 * content/press/press-releases.json и press-releases.xml.
 */
export {
  PRESS_CATEGORIES,
  PRESS_REF_PREFIX,
  parsePressFile,
  pressFileSchema,
  pressParagraphs,
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
export type { PressCategory, PressRelease } from './model';

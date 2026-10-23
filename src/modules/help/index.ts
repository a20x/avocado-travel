/**
 * Модуль help: справка — вопросы и ответы с оглавлением на якорях (L1-06).
 * Общий вход: можно импортировать откуда угодно. Компоненты — в `@/modules/help/ui` (ADR-0008).
 * Базы и сервисов у модуля нет: текст справки лежит в коде.
 */
export { HELP_SECTIONS } from './content';
export { HELP_ANCHOR_PATTERN, helpSearchDocuments } from './model';
export type { HelpQuestion, HelpSection } from './model';

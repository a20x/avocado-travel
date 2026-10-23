/**
 * Модуль poll: опрос посетителей с результатами-диаграммой (L1-S10).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/poll/server`,
 * компоненты — в `@/modules/poll/ui` (ADR-0008).
 */
export { pollOptions, pollVotes, polls } from './schema';
export { voteInputSchema, voterKey, withPercents } from './model';
export type { PollError, PollOptionResult, PollView, VoteInput } from './model';

/**
 * Серверный вход модуля forum (ADR-0008).
 */
import 'server-only';

export { getTopic, listPosts, listTopics } from './server/service';

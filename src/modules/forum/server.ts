/**
 * Серверный вход модуля forum (ADR-0008).
 */
import 'server-only';

export { getTopic, listPosts, listTopicLinks, listTopics } from './server/service';

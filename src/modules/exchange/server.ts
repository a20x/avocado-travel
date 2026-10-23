/**
 * Серверный вход модуля exchange (ADR-0008).
 */
import 'server-only';

export { apiRoute, handleOpenApi, handleUnknownEndpoint } from './server/route';

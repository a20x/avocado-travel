/**
 * Серверный вход модуля press (ADR-0008).
 */
import 'server-only';

export { handlePressData, handlePressSchema } from './server/routes';
export { getPressView, loadPressReleases } from './server/service';

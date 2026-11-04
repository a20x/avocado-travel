/**
 * Серверный вход модуля press (ADR-0008).
 */
import 'server-only';

export { handlePressData, handlePressSchema } from './server/routes';
export { indexPressReleases, loadPressReleases } from './server/service';
export { getXmlTable, handlePressTransform, handlePressXmlFile } from './server/xml';

/**
 * Серверный вход модуля ads (ADR-0008).
 */
import 'server-only';

export { handleAdClick } from './server/click';
export { getAdsFor, getCampaign, listCampaigns } from './server/service';

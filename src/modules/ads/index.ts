/**
 * Модуль ads: рекламные кампании, показы и клики (L1-S12).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/ads/server`,
 * компоненты — в `@/modules/ads/ui` (ADR-0008).
 */
export { adCampaigns, adEventType, adEvents, adPlacement } from './schema';
export {
  AD_IMAGES,
  PLACEMENTS,
  PLACEMENT_LIMIT,
  adStatus,
  campaignInputSchema,
  ctr,
  datesFromPeriod,
  isSafeTarget,
  periodFromDates,
  pickAds,
} from './model';
export type {
  AdCampaign,
  AdError,
  AdPlacement,
  AdStats,
  AdStatus,
  AdView,
  CampaignInput,
} from './model';

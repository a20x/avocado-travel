import { z } from 'zod';
import { addDays, dateInZone, zonedTimeToUtc } from '@/shared/lib/time';
import type { adCampaigns } from './schema';

export type AdCampaign = typeof adCampaigns.$inferSelect;
export type AdPlacement = AdCampaign['placement'];

/** Что видит посетитель: без служебных полей. */
export type AdView = Pick<AdCampaign, 'id' | 'title' | 'text' | 'image'>;

export type AdStats = { impressions: number; clicks: number };

export type AdStatus = 'active' | 'scheduled' | 'finished' | 'disabled';

const ZONE = 'Europe/Moscow';

export const PLACEMENTS: Record<AdPlacement, string> = {
  home: 'Главная',
  search: 'Результаты поиска',
};

/** Картинки баннеров (public/images/README.md, «ads»). Загрузки файлов нет — выбор из набора. */
export const AD_IMAGES: Record<string, string> = {
  '/images/ads/early-booking.svg': 'Раннее бронирование',
  '/images/ads/baggage.svg': 'Багаж',
  '/images/ads/sea-weekend.svg': 'Выходные у моря',
  '/images/ads/winter-mountains.svg': 'Зимние горы',
};

/** Сколько кампаний одновременно показывается в каждом месте. */
export const PLACEMENT_LIMIT: Record<AdPlacement, number> = { home: 3, search: 1 };

/** Состояние кампании в момент `now`. */
export function adStatus(
  campaign: Pick<AdCampaign, 'isEnabled' | 'startsAt' | 'endsAt'>,
  now: Date,
): AdStatus {
  if (!campaign.isEnabled) return 'disabled';
  if (now < campaign.startsAt) return 'scheduled';
  if (now >= campaign.endsAt) return 'finished';
  return 'active';
}

/** Доля кликов от показов, % с одним знаком; без показов — null. */
export function ctr({ impressions, clicks }: AdStats): number | null {
  return impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : null;
}

/**
 * Какие кампании показать: случайные из активных, не больше лимита места.
 * Случайный порядок — чтобы все активные кампании получали показы по очереди.
 */
export function pickAds<T>(active: T[], limit: number, random: () => number = Math.random): T[] {
  const shuffled = [...active];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled.slice(0, limit);
}

/** Ссылка кампании: внешний сайт по http(s) или страница нашего сайта (`/…`, но не `//…`). */
export function isSafeTarget(url: string): boolean {
  if (url.startsWith('/')) return !url.startsWith('//') && !url.startsWith('/\\');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Период из формы (даты по Москве, окончание включительно) → моменты для базы. */
export function periodFromDates(startDate: string, endDate: string) {
  return {
    startsAt: zonedTimeToUtc(startDate, '00:00', ZONE),
    endsAt: zonedTimeToUtc(addDays(endDate, 1), '00:00', ZONE),
  };
}

/** Обратно: моменты из базы → даты для формы и таблицы. */
export function datesFromPeriod(campaign: Pick<AdCampaign, 'startsAt' | 'endsAt'>) {
  return {
    startDate: dateInZone(campaign.startsAt, ZONE),
    endDate: addDays(dateInZone(campaign.endsAt, ZONE), -1),
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const campaignInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Заголовок — от 3 символов')
      .max(80, 'Заголовок — до 80 символов'),
    text: z.string().trim().min(10, 'Текст — от 10 символов').max(200, 'Текст — до 200 символов'),
    image: z.string().refine((value) => value in AD_IMAGES, 'Выберите картинку из списка'),
    targetUrl: z
      .string()
      .trim()
      .max(500, 'Ссылка — до 500 символов')
      .refine(isSafeTarget, 'Нужен адрес https://… или страница сайта, начиная с /'),
    placement: z.enum(['home', 'search'], 'Выберите место показа'),
    startDate: z.string().regex(DATE, 'Укажите дату начала'),
    endDate: z.string().regex(DATE, 'Укажите дату окончания'),
    isEnabled: z.boolean(),
  })
  .refine((input) => input.endDate >= input.startDate, {
    path: ['endDate'],
    message: 'Окончание не раньше начала',
  });
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export type AdError = 'NOT_FOUND';

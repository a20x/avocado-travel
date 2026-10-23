import 'server-only';
import { after } from 'next/server';
import { z } from 'zod';
import { isBot } from '@/modules/stats';
import { getUserAgent } from '@/server/request';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  PLACEMENT_LIMIT,
  adStatus,
  isSafeTarget,
  periodFromDates,
  pickAds,
  type AdCampaign,
  type AdError,
  type AdPlacement,
  type AdStats,
  type AdView,
  type CampaignInput,
} from '../model';
import * as repository from './repository';

const parseId = (id: unknown) => z.coerce.number().int().positive().safeParse(id);

/**
 * Кампании для показа в месте `placement`. Показ засчитывается, когда страница отдана
 * посетителю: запись идёт после ответа (`after`), чтобы не задерживать страницу.
 * Поисковые роботы показов не набирают.
 */
export async function getAdsFor(placement: AdPlacement, now = new Date()): Promise<AdView[]> {
  const ads = pickAds(await repository.findActive(placement, now), PLACEMENT_LIMIT[placement]);
  if (ads.length > 0 && !isBot(await getUserAgent())) {
    const ids = ads.map((ad) => ad.id);
    after(() => repository.insertEvents(ids, 'impression'));
  }
  return ads;
}

/**
 * Переход по рекламе (`/go/ad/[id]`): куда вести посетителя. Клик засчитывается только
 * у идущей сейчас кампании; по ссылке завершённой посетитель всё равно попадёт на её адрес.
 * null — кампании нет.
 */
export async function registerClick(id: unknown, now = new Date()): Promise<string | null> {
  const parsed = parseId(id);
  const campaign = parsed.success ? await repository.findCampaign(parsed.data) : null;
  if (!campaign || !isSafeTarget(campaign.targetUrl)) return null;
  if (adStatus(campaign, now) === 'active' && !isBot(await getUserAgent())) {
    await repository.insertEvents([campaign.id], 'click');
  }
  return campaign.targetUrl;
}

/* Админка. Права проверяет action или страница, которые вызывают эти функции. */

export function listCampaigns(): Promise<Array<AdCampaign & AdStats>> {
  return repository.findAllWithStats();
}

export async function getCampaign(id: unknown): Promise<AdCampaign | null> {
  const parsed = parseId(id);
  return parsed.success ? repository.findCampaign(parsed.data) : null;
}

function toValues({ startDate, endDate, ...rest }: CampaignInput) {
  return { ...rest, ...periodFromDates(startDate, endDate) };
}

export async function createCampaign(input: CampaignInput): Promise<void> {
  await repository.insertCampaign(toValues(input));
}

export async function updateCampaign(
  id: unknown,
  input: CampaignInput,
): Promise<Result<null, AdError>> {
  const parsed = parseId(id);
  if (!parsed.success) return fail('NOT_FOUND');
  return (await repository.updateCampaign(parsed.data, toValues(input)))
    ? ok(null)
    : fail('NOT_FOUND');
}

export async function setEnabled(id: unknown, isEnabled: boolean): Promise<Result<null, AdError>> {
  const parsed = parseId(id);
  if (!parsed.success) return fail('NOT_FOUND');
  return (await repository.updateCampaign(parsed.data, { isEnabled }))
    ? ok(null)
    : fail('NOT_FOUND');
}

export async function deleteCampaign(id: unknown): Promise<Result<null, AdError>> {
  const parsed = parseId(id);
  if (!parsed.success) return fail('NOT_FOUND');
  return (await repository.deleteCampaign(parsed.data)) ? ok(null) : fail('NOT_FOUND');
}

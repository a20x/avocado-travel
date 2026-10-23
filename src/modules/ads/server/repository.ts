import 'server-only';
import { and, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { db } from '@/server/db';
import type { AdCampaign, AdPlacement, AdStats, AdView } from '../model';
import { adCampaigns, adEvents } from '../schema';

/** Включённые кампании места, идущие сейчас. */
export function findActive(placement: AdPlacement, now: Date): Promise<AdView[]> {
  return db
    .select({
      id: adCampaigns.id,
      title: adCampaigns.title,
      text: adCampaigns.text,
      image: adCampaigns.image,
    })
    .from(adCampaigns)
    .where(
      and(
        eq(adCampaigns.placement, placement),
        eq(adCampaigns.isEnabled, true),
        lte(adCampaigns.startsAt, now),
        gt(adCampaigns.endsAt, now),
      ),
    );
}

export async function insertEvents(campaignIds: number[], type: 'impression' | 'click') {
  if (campaignIds.length === 0) return;
  await db.insert(adEvents).values(campaignIds.map((campaignId) => ({ campaignId, type })));
}

export async function findCampaign(id: number): Promise<AdCampaign | null> {
  const [campaign] = await db.select().from(adCampaigns).where(eq(adCampaigns.id, id));
  return campaign ?? null;
}

/** Все кампании, новые сверху, с показами и кликами за всё время. */
export function findAllWithStats(): Promise<Array<AdCampaign & AdStats>> {
  const impressions = sql<number>`count(*) filter (where ${adEvents.type} = 'impression')`.mapWith(
    Number,
  );
  const clicks = sql<number>`count(*) filter (where ${adEvents.type} = 'click')`.mapWith(Number);
  return db
    .select({
      id: adCampaigns.id,
      title: adCampaigns.title,
      text: adCampaigns.text,
      image: adCampaigns.image,
      targetUrl: adCampaigns.targetUrl,
      placement: adCampaigns.placement,
      startsAt: adCampaigns.startsAt,
      endsAt: adCampaigns.endsAt,
      isEnabled: adCampaigns.isEnabled,
      createdAt: adCampaigns.createdAt,
      impressions,
      clicks,
    })
    .from(adCampaigns)
    .leftJoin(adEvents, eq(adEvents.campaignId, adCampaigns.id))
    .groupBy(adCampaigns.id)
    .orderBy(desc(adCampaigns.startsAt), desc(adCampaigns.id));
}

type CampaignValues = Omit<AdCampaign, 'id' | 'createdAt'>;

export async function insertCampaign(values: CampaignValues): Promise<void> {
  await db.insert(adCampaigns).values(values);
}

export async function updateCampaign(
  id: number,
  values: Partial<CampaignValues>,
): Promise<boolean> {
  const rows = await db
    .update(adCampaigns)
    .set(values)
    .where(eq(adCampaigns.id, id))
    .returning({ id: adCampaigns.id });
  return rows.length > 0;
}

/** Кампания вместе с её показами и кликами (каскадом). */
export async function deleteCampaign(id: number): Promise<boolean> {
  const rows = await db
    .delete(adCampaigns)
    .where(eq(adCampaigns.id, id))
    .returning({ id: adCampaigns.id });
  return rows.length > 0;
}

import { adCampaigns, adEvents, periodFromDates } from '@/modules/ads';
import { addDays } from '@/shared/lib/time';
import type { Db } from './db';
import { createRandom } from './schedule';

// Пять кампаний (docs/04-data-model.md, «Демо-данные»): три идут сейчас (две на главной,
// одна в поиске), одна выключена, у одной срок истёк. Показы и клики — за дни показа
// в пределах 60 дней до вчерашнего: данные для админки и отчётов аналитики.

type DemoCampaign = {
  title: string;
  text: string;
  image: string;
  targetUrl: string;
  placement: 'home' | 'search';
  /** Дни относительно сегодняшнего: начало и окончание (включительно). */
  from: number;
  to: number;
  isEnabled?: boolean;
  /** Показов в день и доля кликов. */
  perDay: number;
  ctr: number;
};

// prettier-ignore
const CAMPAIGNS: DemoCampaign[] = [
  { title: 'Выходные у моря', text: 'Сочи и Стамбул — пара часов в пути. Выберите рейс на пятницу и вернитесь в воскресенье.', image: '/images/ads/sea-weekend.svg', targetUrl: '/destinations/sochi', placement: 'home', from: -40, to: 30, perDay: 120, ctr: 0.034 },
  { title: 'Бронируйте заранее', text: 'За месяц до вылета выбор мест шире, а цены ниже. Посмотрите рейсы на ноябрь.', image: '/images/ads/early-booking.svg', targetUrl: '/destinations', placement: 'home', from: -25, to: 45, perDay: 100, ctr: 0.021 },
  { title: 'Багаж уже в цене', text: 'Отметьте «С багажом» в фильтрах — и в списке останутся только тарифы с чемоданом.', image: '/images/ads/baggage.svg', targetUrl: '/airlines', placement: 'search', from: -50, to: 20, perDay: 80, ctr: 0.045 },
  { title: 'Осенняя распродажа', text: 'Черновик кампании: включится, когда будут готовы условия.', image: '/images/ads/early-booking.svg', targetUrl: '/', placement: 'home', from: -5, to: 25, isEnabled: false, perDay: 0, ctr: 0 },
  { title: 'Зима на Байкале', text: 'Прозрачный лёд и солнце: летим в Иркутск.', image: '/images/ads/winter-mountains.svg', targetUrl: '/destinations/irkutsk', placement: 'home', from: -60, to: -12, perDay: 90, ctr: 0.028 },
];

export async function seedAds(
  db: Db,
  today: string,
): Promise<{ campaigns: number; events: number }> {
  const random = createRandom(20261025);
  const events: Array<typeof adEvents.$inferInsert> = [];

  for (const campaign of CAMPAIGNS) {
    const [created] = await db
      .insert(adCampaigns)
      .values({
        title: campaign.title,
        text: campaign.text,
        image: campaign.image,
        targetUrl: campaign.targetUrl,
        placement: campaign.placement,
        isEnabled: campaign.isEnabled ?? true,
        ...periodFromDates(addDays(today, campaign.from), addDays(today, campaign.to)),
        createdAt: periodFromDates(addDays(today, campaign.from - 3), today).startsAt,
      })
      .returning({ id: adCampaigns.id });
    if (!created) throw new Error('Кампания не создана');

    // События — за прошедшие дни показа, но не раньше 60 дней назад и не сегодня.
    for (let day = Math.max(campaign.from, -60); day <= Math.min(campaign.to, -1); day++) {
      const start = periodFromDates(addDays(today, day), addDays(today, day)).startsAt.getTime();
      const impressions = Math.round(campaign.perDay * (0.7 + random() * 0.6));
      for (let i = 0; i < impressions; i++) {
        const at = new Date(start + Math.floor(random() * 86_400_000));
        events.push({ campaignId: created.id, type: 'impression', createdAt: at });
        if (random() < campaign.ctr) {
          events.push({
            campaignId: created.id,
            type: 'click',
            createdAt: new Date(at.getTime() + 5000),
          });
        }
      }
    }
  }

  // Порциями: у PostgreSQL есть предел числа параметров в одном запросе.
  for (let i = 0; i < events.length; i += 2000) {
    await db.insert(adEvents).values(events.slice(i, i + 2000));
  }
  return { campaigns: CAMPAIGNS.length, events: events.length };
}

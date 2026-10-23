import { describe, expect, it } from 'vitest';
import {
  adStatus,
  campaignInputSchema,
  ctr,
  datesFromPeriod,
  isSafeTarget,
  periodFromDates,
  pickAds,
} from './model';

const now = new Date('2026-10-23T12:00:00Z');
const campaign = (startsAt: string, endsAt: string, isEnabled = true) => ({
  isEnabled,
  startsAt: new Date(startsAt),
  endsAt: new Date(endsAt),
});

describe('состояние кампании', () => {
  it('активна в своём периоде, иначе запланирована или завершена', () => {
    expect(adStatus(campaign('2026-10-01', '2026-11-01'), now)).toBe('active');
    expect(adStatus(campaign('2026-11-01', '2026-12-01'), now)).toBe('scheduled');
    expect(adStatus(campaign('2026-09-01', '2026-10-01'), now)).toBe('finished');
    expect(adStatus(campaign('2026-10-01', '2026-11-01', false), now)).toBe('disabled');
  });

  it('период из формы: окончание включительно, по Москве', () => {
    const period = periodFromDates('2026-10-01', '2026-10-31');
    expect(period.startsAt.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(period.endsAt.toISOString()).toBe('2026-10-31T21:00:00.000Z');
    expect(datesFromPeriod(period)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
  });
});

describe('показы и клики', () => {
  it('CTR — доля кликов с одним знаком, без показов — нет', () => {
    expect(ctr({ impressions: 1000, clicks: 25 })).toBe(2.5);
    expect(ctr({ impressions: 3, clicks: 1 })).toBe(33.3);
    expect(ctr({ impressions: 0, clicks: 0 })).toBeNull();
  });

  it('показывается не больше лимита, без повторов', () => {
    const picked = pickAds([1, 2, 3, 4, 5], 3, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    expect(pickAds([1], 3)).toEqual([1]);
  });
});

describe('ссылка кампании', () => {
  it('внешний сайт по http(s) или страница сайта', () => {
    expect(isSafeTarget('https://example.com/promo')).toBe(true);
    expect(isSafeTarget('/destinations/sochi')).toBe(true);
    expect(isSafeTarget('//evil.example')).toBe(false);
    expect(isSafeTarget('/\\evil.example')).toBe(false);
    expect(isSafeTarget('javascript:alert(1)')).toBe(false);
    expect(isSafeTarget('promo')).toBe(false);
  });

  it('форма: окончание не раньше начала, картинка из набора', () => {
    const valid = {
      title: 'Выходные у моря',
      text: 'Сочи и Стамбул — два часа в пути.',
      image: '/images/ads/sea-weekend.svg',
      targetUrl: '/destinations/sochi',
      placement: 'home',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isEnabled: true,
    };
    expect(campaignInputSchema.safeParse(valid).success).toBe(true);
    const wrong = campaignInputSchema.safeParse({
      ...valid,
      endDate: '2026-09-30',
      image: '/etc/passwd',
    });
    expect(wrong.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(['endDate', 'image']);
  });
});

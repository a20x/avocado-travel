import 'server-only';
import { env } from '@/server/env';
import { takeRateLimit } from '@/server/rate-limit';
import { getClientIp, getUserAgent } from '@/server/request';
import { getVisitor } from '@/server/visitor';
import { addDays, dateInZone, daysBetween, zonedDayRange } from '@/shared/lib/time';
import {
  isBot,
  isTrackedPath,
  parsePeriod,
  referrerHost,
  sectionOf,
  type Counters,
  type HitInput,
  type StatsReport,
} from '../model';
import * as repository from './repository';

const ZONE = 'Europe/Moscow';

/** Больше 60 просмотров в минуту с одного IP не записываются: так счётчик не накрутить скриптом. */
const HIT_LIMIT = { limit: 60, windowMs: 60_000 };

/** Номер счётчика Яндекс.Метрики или undefined, если Метрика не настроена. */
export function getMetrikaId(): string | undefined {
  return env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
}

export function getCounters(now = new Date()): Promise<Counters> {
  return repository.findCounters(zonedDayRange(dateInZone(now, ZONE), ZONE).start);
}

/**
 * Открытие страницы: записывает просмотр и возвращает цифры для счётчика.
 * Служебные адреса, роботы и слишком частые запросы не записываются, но цифры получают.
 */
export async function recordHit(
  input: HitInput,
  siteHost: string | null,
  now = new Date(),
): Promise<Counters> {
  const ip = await getClientIp();
  const countable =
    isTrackedPath(input.path) &&
    !isBot(await getUserAgent()) &&
    (env.RATE_LIMIT_DISABLED || takeRateLimit(`stats:${ip}`, HIT_LIMIT));

  if (countable) {
    await repository.insertView({
      path: input.path,
      section: sectionOf(input.path),
      visitorHash: (await getVisitor(now)).dailyHash,
      referrerHost: referrerHost(input.referrer, siteHost),
    });
  }
  return getCounters(now);
}

/** Отчёт для админки за период `?from=…&to=…` (по умолчанию — последние 30 дней). */
export async function getReport(
  params: { from?: unknown; to?: unknown },
  now = new Date(),
): Promise<StatsReport> {
  const today = dateInZone(now, ZONE);
  const period = parsePeriod(params, today);
  const range = {
    start: zonedDayRange(period.from, ZONE).start,
    end: zonedDayRange(period.to, ZONE).end,
  };

  const [todayTotals, inPeriod, allTime, days, bySection, referrers, recent] = await Promise.all([
    repository.findTotals(zonedDayRange(today, ZONE)),
    repository.findTotals(range),
    repository.findTotals(),
    repository.findByDay(range),
    repository.findBySection(range),
    repository.findReferrers(range, 20),
    repository.findRecent(range, 20),
  ]);

  // Дни без просмотров тоже показываем — с нулями, иначе в таблице будут «дыры».
  const byDate = new Map(days.map((day) => [day.date, day]));
  const byDay = Array.from({ length: daysBetween(period.from, period.to) + 1 }, (_, i) => {
    const date = addDays(period.from, i);
    return byDate.get(date) ?? { date, views: 0, visitors: 0 };
  });

  return { period, today: todayTotals, inPeriod, allTime, byDay, bySection, referrers, recent };
}

import { createHash } from 'node:crypto';
import { pageViews, sectionOf } from '@/modules/stats';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import type { Db } from './db';
import { createRandom, weekday } from './schedule';

// Просмотры за 90 дней до вчерашнего (docs/04-data-model.md, «Демо-данные»): сегодняшние цифры
// счётчика набираются уже настоящими открытиями страниц. Посещаемость растёт к сегодняшнему дню,
// в выходные выше.

type Weighted<T> = Array<[T, number]>;

const PATHS: Weighted<string[]> = [
  [['/'], 30],
  [['/flights'], 25],
  [
    ['/destinations', '/destinations/kaliningrad', '/destinations/sochi', '/destinations/kazan'],
    12,
  ],
  [['/news', '/news/avocado-travel-otkrylsya'], 10],
  [['/airlines'], 6],
  [['/forum'], 6],
  [['/guestbook'], 4],
  [['/account'], 4],
  [['/login'], 3],
];

const REFERRERS: Weighted<string> = [
  ['yandex.ru', 45],
  ['google.com', 20],
  ['vk.com', 12],
  ['t.me', 10],
  ['dzen.ru', 8],
  ['ya.ru', 5],
];

function pick<T>(items: Weighted<T>, random: () => number): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let point = random() * total;
  for (const [item, weight] of items) {
    point -= weight;
    if (point < 0) return item;
  }
  return items[0]![0];
}

const pad = (value: number) => String(value).padStart(2, '0');

export async function seedStats(db: Db, today: string): Promise<number> {
  const random = createRandom(20261022);
  const rows: Array<typeof pageViews.$inferInsert> = [];

  for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
    const day = addDays(today, -daysAgo);
    const isWeekend = weekday(day) >= 6;
    const views = Math.round(
      (35 + (90 - daysAgo) * 0.4) * (isWeekend ? 1.3 : 1) * (0.8 + random() * 0.4),
    );
    const visitors = Math.max(1, Math.round(views / 3));
    const seen = new Set<number>();

    for (let i = 0; i < views; i++) {
      const visitor = Math.floor(random() * visitors);
      const paths = pick(PATHS, random);
      const path = paths[Math.floor(random() * paths.length)] ?? '/';
      // Источник — только у первого просмотра посетителя за день: дальше он ходит по сайту.
      const referrerHost = !seen.has(visitor) && random() < 0.4 ? pick(REFERRERS, random) : null;
      seen.add(visitor);
      const time = `${pad(7 + Math.floor(random() * 17))}:${pad(Math.floor(random() * 60))}`;
      rows.push({
        path,
        section: sectionOf(path),
        visitorHash: createHash('sha256')
          .update(`demo:${day}:${visitor}`)
          .digest('hex')
          .slice(0, 32),
        referrerHost,
        createdAt: zonedTimeToUtc(day, time, 'Europe/Moscow'),
      });
    }
  }

  // Порциями: у PostgreSQL есть предел числа параметров в одном запросе.
  for (let i = 0; i < rows.length; i += 1000) {
    await db.insert(pageViews).values(rows.slice(i, i + 1000));
  }
  return rows.length;
}

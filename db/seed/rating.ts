import { createHash } from 'node:crypto';
import { siteRatings } from '@/modules/rating';
import { addDays } from '@/shared/lib/time';
import type { Db } from './db';
import { createRandom } from './schedule';

// Около 150 оценок за 90 дней до вчерашнего: в основном 4 и 5, средний балл чуть выше 4.
// Сегодняшних оценок нет — сегодня каждый посетитель может оценить сайт сам.
const SCORE_WEIGHTS: Array<[number, number]> = [
  [5, 55],
  [4, 28],
  [3, 10],
  [2, 4],
  [1, 3],
];

function pickScore(random: () => number): number {
  let point = random() * 100;
  for (const [score, weight] of SCORE_WEIGHTS) {
    point -= weight;
    if (point < 0) return score;
  }
  return 5;
}

export async function seedRatings(db: Db, today: string): Promise<number> {
  const random = createRandom(20261023);
  const rows: Array<typeof siteRatings.$inferInsert> = [];
  for (let daysAgo = 90; daysAgo >= 1; daysAgo--) {
    const day = addDays(today, -daysAgo);
    const perDay = Math.floor(random() * 4);
    for (let i = 0; i < perDay; i++) {
      rows.push({
        score: pickScore(random),
        visitorHash: createHash('sha256')
          .update(`demo-rating:${day}:${i}`)
          .digest('hex')
          .slice(0, 32),
        day,
      });
    }
  }
  await db.insert(siteRatings).values(rows);
  return rows.length;
}

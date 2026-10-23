import 'server-only';
import { dateInZone } from '@/shared/lib/time';
import { env } from './env';
import { getClientIp } from './request';
import { hashIp } from './visitor-hash';

export type Visitor = {
  /** Сегодняшняя дата по Москве. */
  day: string;
  /** Хэш IP на сегодня: завтра у того же посетителя будет другой. */
  dailyHash: string;
  /** Постоянный хэш IP. */
  stableHash: string;
};

/** Анонимный посетитель текущего запроса — без IP в открытом виде. */
export async function getVisitor(now = new Date()): Promise<Visitor> {
  const ip = await getClientIp();
  const day = dateInZone(now, 'Europe/Moscow');
  return {
    day,
    dailyHash: hashIp(ip, env.IP_HASH_SALT, day),
    stableHash: hashIp(ip, env.IP_HASH_SALT),
  };
}

import { createHash } from 'node:crypto';

/**
 * Хэш IP с солью и датой (docs/02-product.md, «Статистика»). Дата в хэше делает посетителя
 * уникальным в пределах суток, соль — не даёт подобрать IP перебором всех адресов.
 */
export function visitorHash(ip: string, day: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${day}:${ip}`).digest('hex').slice(0, 32);
}

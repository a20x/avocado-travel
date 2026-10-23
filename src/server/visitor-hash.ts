import { createHash } from 'node:crypto';

/**
 * Хэш IP с солью (docs/02-product.md, «Статистика»): по нему узнают повторного посетителя,
 * но восстановить адрес нельзя — соль не даёт подобрать IP перебором всех адресов.
 * С датой — посетитель уникален в пределах суток (статистика, рейтинг); без даты — один
 * и тот же всегда (голос в опросе).
 */
export function hashIp(ip: string, salt: string, day?: string): string {
  const input = day ? `${salt}:${day}:${ip}` : `${salt}:${ip}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

import 'server-only';
import { headers } from 'next/headers';

/**
 * IP посетителя — единственное место, где он определяется (docs/03-architecture.md, «Безопасность»).
 * За прокси хостинга настоящий адрес — первый в X-Forwarded-For.
 */
export async function getClientIp(): Promise<string> {
  const list = await headers();
  const forwarded = list.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || list.get('x-real-ip') || 'unknown';
}

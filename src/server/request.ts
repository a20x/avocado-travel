import 'server-only';
import { headers } from 'next/headers';
import { env } from './env';

/** Заголовки запроса — только чтение, чтобы правило выбора адреса проверялось тестом без Next.js. */
type RequestHeaders = Pick<Headers, 'get'>;

/**
 * IP посетителя — единственное место, где он определяется (docs/03-architecture.md, «Безопасность»).
 *
 * Если хостинг ставит свой заголовок с адресом посетителя (CLIENT_IP_HEADER, на Render —
 * true-client-ip от Cloudflare), берётся он: прокси перезаписывает его, подделать нельзя.
 * Иначе — ПОСЛЕДНИЙ адрес из X-Forwarded-For: его дописывает прокси, а первые адреса
 * присылает сам браузер — по ним бан и ограничение частоты обходились бы одним заголовком.
 * Next.js без прокси ставит сюда адрес соединения сам.
 */
export async function getClientIp(): Promise<string> {
  return clientIpFrom(await headers(), env.CLIENT_IP_HEADER);
}

/** Разбор заголовков отдельно от Next.js — чтобы правило выбора адреса проверялось тестом. */
export function clientIpFrom(list: RequestHeaders, trustedHeader?: string): string {
  if (trustedHeader) {
    const trusted = list.get(trustedHeader)?.trim();
    if (trusted) return trusted;
  }
  const last = list.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  return last || list.get('x-real-ip')?.trim() || 'unknown';
}

/** Браузер посетителя — для записей гостевой книги и разбора спама. Обрезается до разумной длины. */
export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get('user-agent')?.slice(0, 300) || null;
}

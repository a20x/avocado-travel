import 'server-only';
import { headers } from 'next/headers';

/**
 * IP посетителя — единственное место, где он определяется (docs/03-architecture.md, «Безопасность»).
 *
 * Берётся ПОСЛЕДНИЙ адрес из X-Forwarded-For: его дописывает прокси хостинга, и подделать его
 * нельзя. Первые адреса списка присылает сам браузер — по ним бан и ограничение частоты
 * обходились бы одним заголовком. Next.js без прокси ставит сюда адрес соединения сам.
 * Расчёт на один прокси перед сайтом; если их станет больше — брать адрес на нужной позиции.
 */
export async function getClientIp(): Promise<string> {
  const list = await headers();
  return clientIpFrom(list.get('x-forwarded-for'), list.get('x-real-ip'));
}

/** Разбор заголовков отдельно от Next.js — чтобы правило выбора адреса проверялось тестом. */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string {
  const last = forwardedFor?.split(',').at(-1)?.trim();
  return last || realIp?.trim() || 'unknown';
}

/** Браузер посетителя — для записей гостевой книги и разбора спама. Обрезается до разумной длины. */
export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get('user-agent')?.slice(0, 300) || null;
}

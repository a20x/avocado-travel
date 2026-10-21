import 'server-only';
import { z } from 'zod';
import { env } from '@/server/env';
import { takeRateLimit } from '@/server/rate-limit';
import { getClientIp, getUserAgent } from '@/server/request';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  ENTRIES_PAGE_SIZE,
  findStopWord,
  type BannedHost,
  type EntryInput,
  type GuestbookEntry,
  type GuestbookError,
  type PublicEntry,
  type StopWord,
} from '../model';
import * as repository from './repository';

/** Не чаще одной записи в минуту с одного IP (docs/02-product.md). */
const POST_LIMIT = { limit: 1, windowMs: 60_000 };

type Page<T> = { items: T[]; page: number; totalPages: number };

function pageNumber(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function toPage<T>(page: number, { items, total }: { items: T[]; total: number }): Page<T> {
  return { items, page, totalPages: Math.max(1, Math.ceil(total / ENTRIES_PAGE_SIZE)) };
}

const paging = (page: number) => ({
  limit: ENTRIES_PAGE_SIZE,
  offset: (page - 1) * ENTRIES_PAGE_SIZE,
});

/** Записи для посетителей: только видимые, новые сверху. */
export async function listEntries(params: { page?: unknown }): Promise<Page<PublicEntry>> {
  const page = pageNumber(params.page);
  return toPage(page, await repository.findVisibleEntries(paging(page)));
}

/**
 * Новая запись посетителя (docs/02-product.md, «Модерация гостевой книги»):
 * с запрещённого хоста — отказ; с запрещённым словом — сохраняется скрытой.
 * Возвращает, видна ли запись сразу.
 */
export async function postEntry(
  input: EntryInput,
): Promise<Result<{ visible: boolean }, GuestbookError>> {
  const rawIp = await getClientIp();
  const ip = z.union([z.ipv4(), z.ipv6()]).safeParse(rawIp).success ? rawIp : null;

  if (ip && (await repository.isHostBanned(ip))) return fail('BANNED_HOST');
  if (!env.RATE_LIMIT_DISABLED && !takeRateLimit(`guestbook:${ip ?? 'unknown'}`, POST_LIMIT)) {
    return fail('TOO_MANY_REQUESTS');
  }

  const words = (await repository.findStopWords()).map((w) => w.word);
  const hasStopWord = findStopWord(`${input.authorName}\n${input.message}`, words) !== null;
  await repository.insertEntry({
    ...input,
    ip,
    userAgent: await getUserAgent(),
    isVisible: !hasStopWord,
    hiddenReason: hasStopWord ? 'stop_word' : null,
  });
  return ok({ visible: !hasStopWord });
}

/* Админка. Права проверяет action, который вызывает эти функции. */

export async function listEntriesForAdmin(params: {
  page?: unknown;
}): Promise<Page<GuestbookEntry>> {
  const page = pageNumber(params.page);
  return toPage(page, await repository.findAllEntries(paging(page)));
}

/** Скрыть или показать запись решением администратора. */
export async function setEntryVisibility(
  id: unknown,
  visible: boolean,
): Promise<Result<null, GuestbookError>> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail('NOT_FOUND');
  const done = await repository.setEntryVisibility(parsed.data, visible, visible ? null : 'admin');
  return done ? ok(null) : fail('NOT_FOUND');
}

export async function deleteEntry(id: unknown): Promise<Result<null, GuestbookError>> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail('NOT_FOUND');
  return (await repository.deleteEntry(parsed.data)) ? ok(null) : fail('NOT_FOUND');
}

/**
 * Пересчитывает видимость записей по текущему списку слов: новое слово скрывает уже
 * опубликованные записи с ним, удалённое — возвращает записи, скрытые только из-за него.
 * Записи, скрытые администратором вручную, не трогает.
 */
async function recheckStopWords(): Promise<void> {
  const words = (await repository.findStopWords()).map((w) => w.word);
  const entries = await repository.findEntriesForWordCheck();
  const hide: string[] = [];
  const show: string[] = [];
  for (const entry of entries) {
    const blocked = findStopWord(`${entry.authorName}\n${entry.message}`, words) !== null;
    if (entry.isVisible && blocked) hide.push(entry.id);
    if (!entry.isVisible && !blocked) show.push(entry.id);
  }
  await repository.applyWordCheck(hide, show);
}

export function listStopWords(): Promise<StopWord[]> {
  return repository.findStopWords();
}

/** Слово уже проверено и нормализовано (stopWordSchema). */
export async function addStopWord(word: string): Promise<Result<null, GuestbookError>> {
  if (!(await repository.insertStopWord(word))) return fail('DUPLICATE');
  await recheckStopWords();
  return ok(null);
}

export async function removeStopWord(id: unknown): Promise<Result<null, GuestbookError>> {
  const parsed = z.coerce.number().int().positive().safeParse(id);
  if (!parsed.success || !(await repository.deleteStopWord(parsed.data))) return fail('NOT_FOUND');
  await recheckStopWords();
  return ok(null);
}

export function listBannedHosts(): Promise<BannedHost[]> {
  return repository.findBannedHosts();
}

/** Адрес уже проверен (bannedHostSchema). */
export async function banHost(host: {
  pattern: string;
  comment: string;
}): Promise<Result<null, GuestbookError>> {
  const added = await repository.insertBannedHost(host.pattern, host.comment);
  return added ? ok(null) : fail('DUPLICATE');
}

export async function unbanHost(id: unknown): Promise<Result<null, GuestbookError>> {
  const parsed = z.coerce.number().int().positive().safeParse(id);
  if (!parsed.success || !(await repository.deleteBannedHost(parsed.data)))
    return fail('NOT_FOUND');
  return ok(null);
}

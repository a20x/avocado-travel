import { z } from 'zod';
import type { guestbookBannedHosts, guestbookEntries, guestbookStopWords } from './schema';

export type GuestbookEntry = typeof guestbookEntries.$inferSelect;
export type StopWord = typeof guestbookStopWords.$inferSelect;
export type BannedHost = typeof guestbookBannedHosts.$inferSelect;

/** Запись для посетителей — без IP и служебных полей. */
export type PublicEntry = Pick<GuestbookEntry, 'id' | 'authorName' | 'message' | 'createdAt'>;

export const ENTRIES_PAGE_SIZE = 10;

/** Правила формы (docs/02-product.md, «Гостевая книга»). */
export const entryInputSchema = z.object({
  authorName: z.string().trim().min(1, 'Представьтесь').max(50, 'Имя — до 50 символов'),
  message: z.string().trim().min(1, 'Напишите сообщение').max(2000, 'Сообщение — до 2000 символов'),
});
export type EntryInput = z.infer<typeof entryInputSchema>;

export const stopWordSchema = z
  .string()
  .trim()
  .min(2, 'Слово — от 2 символов')
  .max(100, 'Слово — до 100 символов')
  .transform(normalizeText);

/** IP-адрес или подсеть: `203.0.113.7`, `203.0.113.0/24`, `2001:db8::/32`. */
export const bannedHostSchema = z.object({
  pattern: z
    .string()
    .trim()
    .pipe(
      z.union(
        [z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()],
        'Нужен IP-адрес или подсеть: 203.0.113.0/24',
      ),
    ),
  comment: z.string().trim().max(200, 'Комментарий — до 200 символов'),
});

export type GuestbookError = 'BANNED_HOST' | 'TOO_MANY_REQUESTS' | 'NOT_FOUND' | 'DUPLICATE';

/** Текст для сравнения: нижний регистр, «ё» как «е», лишние пробелы схлопнуты. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replaceAll('ё', 'е').replace(/\s+/g, ' ').trim();
}

/**
 * Первое запрещённое слово или выражение в тексте, или null. Ищется целиком, а не как часть
 * другого слова: стоп-слово «ласс» не должно скрывать сообщение про «бизнес-класс».
 */
export function findStopWord(text: string, words: string[]): string | null {
  const normalized = normalizeText(text);
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(normalized)) {
      return word;
    }
  }
  return null;
}

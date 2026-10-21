import { formatDate } from '@/shared/lib/format';
import { dateInZone, timeInZone } from '@/shared/lib/time';

/** «21 октября, 14:05» по Москве. */
export function entryDate(at: Date): string {
  return `${formatDate(dateInZone(at, 'Europe/Moscow'))}, ${timeInZone(at, 'Europe/Moscow')}`;
}

'use client';

import { timeInZone } from '@/shared/lib/time';
import { formatDifference, zoneDifference } from '../model';
import { useNow } from './useNow';

/** Местное время в городе и разница с Москвой — для страницы направления (L1-S09). */
export function LocalTime({ timezone, initialNow }: { timezone: string; initialNow: number }) {
  const now = useNow(initialNow);
  const difference = zoneDifference('Europe/Moscow', timezone, now);
  return (
    <span>
      <time
        dateTime={now.toISOString()}
        className="font-semibold tabular-nums"
        suppressHydrationWarning
      >
        {timeInZone(now, timezone)}
      </time>
      <span className="text-slate">
        {' '}
        ({difference === 0 ? 'как в Москве' : `${formatDifference(difference)} к Москве`})
      </span>
    </span>
  );
}

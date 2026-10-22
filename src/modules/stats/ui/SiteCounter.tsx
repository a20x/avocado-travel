'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Counters } from '../model';

declare global {
  interface Window {
    /** Функция Яндекс.Метрики — появляется, если код Метрики подключён. */
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

// Откуда пришли, имеет смысл только для первой страницы: дальше переходы идут внутри сайта.
let firstHit = true;

const format = (value: number | undefined) => value?.toLocaleString('ru-RU') ?? '—';

/**
 * Счётчик посещений в подвале (L1-08, L1-S01). При открытии каждой страницы сообщает
 * серверу адрес и показывает свежие цифры. Подвал не перерисовывается при переходах
 * по сайту, поэтому адрес отслеживается через usePathname.
 */
export function SiteCounter({ metrikaId }: { metrikaId?: string }) {
  const pathname = usePathname();
  const [counters, setCounters] = useState<Counters | null>(null);
  // В режиме разработки React запускает эффект дважды — второй раз тот же адрес не считаем.
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const referrer = firstHit ? document.referrer : '';
    // Первый просмотр Метрика считает сама при загрузке, дальнейшие переходы — сообщаем мы.
    if (!firstHit && metrikaId) window.ym?.(Number(metrikaId), 'hit', window.location.href);
    firstHit = false;

    fetch('/api/stats/hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer }),
      keepalive: true,
    })
      .then((response) => (response.ok ? (response.json() as Promise<Counters>) : null))
      .then((data) => {
        if (data) setCounters(data);
      })
      // Счётчик — не главное на странице: при ошибке сети просто остаются прочерки.
      .catch(() => {});
  }, [pathname, metrikaId]);

  const items: Array<[string, number | undefined]> = [
    ['Просмотров сегодня', counters?.viewsToday],
    ['Посетителей сегодня', counters?.visitorsToday],
    ['Просмотров всего', counters?.viewsTotal],
  ];

  return (
    <section aria-labelledby="counter-title" className="grid content-start gap-2">
      <h2 id="counter-title" className="text-sm text-white">
        Счётчик посещений
      </h2>
      <dl className="grid w-fit grid-cols-3 divide-x divide-slate rounded-sm border border-slate">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 px-3 py-2">
            <dt className="text-xs leading-tight text-line-strong">{label}</dt>
            <dd className="font-mono text-base text-white tabular-nums">{format(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';

/**
 * Текущее время, которое обновляется каждые 15 секунд. Начальное значение приходит
 * с сервера, чтобы HTML сервера и браузера совпадали при первой отрисовке; часы
 * показывают минуты, поэтому расхождение в секунды до первого обновления незаметно.
 */
export function useNow(initial: number): Date {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return new Date(now);
}

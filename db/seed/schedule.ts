import { roundTo } from '@/modules/flights';

/**
 * Чистые функции генератора расписания: без базы, поэтому проверяются тестами.
 * Расстояние, время в пути и цены считает модуль flights (`schedule.ts`) — по тем же
 * правилам он заполняет рейсы, которые администратор заводит в админке.
 */

/**
 * Генератор случайных чисел с зерном (mulberry32): при одном и том же зерне выдаёт
 * одну и ту же последовательность. Поэтому демо-данные при каждом запуске одинаковы.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Время вылета рейсов за день: n рейсов равномерно с 06:30 до 22:30 местного времени. */
export function departureTimes(perDay: number, random: () => number): string[] {
  const first = 6 * 60 + 30;
  const span = 16 * 60;
  return Array.from({ length: perDay }, (_, i) => {
    const base = first + Math.floor((span / perDay) * i);
    const minutes = roundTo(base + random() * 50, 5);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  });
}

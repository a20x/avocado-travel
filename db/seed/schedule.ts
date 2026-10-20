/**
 * Чистые функции генератора расписания: без базы, поэтому проверяются тестами.
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

type Point = { lat: number; lon: number };

/** Расстояние между точками по поверхности Земли (формула гаверсинусов), км. */
export function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Время в пути: крейсерская скорость ~780 км/ч плюс 35 минут на взлёт и посадку, кратно 5 минутам. */
export function flightMinutes(km: number): number {
  return roundTo((km / 780) * 60 + 35, 5);
}

/** Базовые цены в копейках: растут с расстоянием, бизнес — в 2,7 раза дороже, кратно 100 ₽. */
export function basePrices(km: number, factor = 1): { economy: number; business: number } {
  const economyRub = roundTo((1900 + km * 2.9) * factor, 100);
  return { economy: economyRub * 100, business: roundTo(economyRub * 2.7, 100) * 100 };
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

/** День недели местной даты: 1 — понедельник … 7 — воскресенье. */
export function weekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

import 'server-only';

type Rule = {
  /** Сколько попыток разрешено за окно. */
  limit: number;
  windowMs: number;
};

/**
 * Попытки по ключу (например, «вход:IP») — время каждой попытки в мс.
 * Хранятся в памяти процесса: при перезапуске счётчики обнуляются. Для одного сервера
 * учебного проекта этого достаточно; при нескольких серверах понадобится общее хранилище.
 */
const attempts = new Map<string, number[]>();

/** Разрешена ли ещё одна попытка. Если да — она сразу засчитывается. */
export function takeRateLimit(key: string, rule: Rule, now: number = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < rule.windowMs);
  if (recent.length >= rule.limit) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

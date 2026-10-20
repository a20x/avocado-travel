/**
 * Результат сервиса: данные или код ожидаемой ошибки (`SEAT_TAKEN`, `DATE_OUT_OF_RANGE`).
 * Ожидаемые ошибки не бросаются исключением — интерфейс показывает по коду понятное сообщение.
 */
export type Result<T, E extends string> = { ok: true; data: T } | { ok: false; error: E };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function fail<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

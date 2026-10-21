/**
 * Правила выбора мест на схеме салона. Без импортов: файл работает и в браузере,
 * в клиентском компоненте схемы. Сервер всё равно проверит выбор при оформлении брони (T-13).
 */

/** Доплата за место с увеличенным расстоянием для ног, копейки (900 ₽). */
export const EXTRA_LEGROOM_PRICE = 90_000;

/**
 * Отмечает место или снимает отметку. Если мест уже выбрано столько, сколько пассажиров,
 * новое место заменяет выбранное раньше всех — не нужно сначала снимать отметку.
 */
export function toggleSeat(selected: string[], seat: string, limit: number): string[] {
  if (selected.includes(seat)) return selected.filter((s) => s !== seat);
  return [...selected, seat].slice(-limit);
}

/** Сумма за выбранные места. */
export function selectionTotal(selected: string[], prices: ReadonlyMap<string, number>): number {
  return selected.reduce((sum, seat) => sum + (prices.get(seat) ?? 0), 0);
}

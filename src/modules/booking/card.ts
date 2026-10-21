/**
 * Проверка формата банковской карты для демо-оплаты (docs/02-product.md, «Демо-оплата»).
 * Данные карты нигде не сохраняются и никуда не отправляются — только проверяются.
 */

/** Алгоритм Луна: контрольная сумма номера карты ловит опечатку в одной цифре. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    // Каждая вторая цифра справа удваивается; если вышло больше 9 — вычитаем 9.
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Номер без пробелов и дефисов: «4242 4242 4242 4242» → «4242424242424242». */
export function normalizeCardNumber(value: string): string {
  return value.replace(/[\s-]/g, '');
}

/** Срок `ММ/ГГ` ещё не прошёл: карта действует до конца указанного месяца. */
export function isExpiryValid(expiry: string, now: Date): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
  return year * 12 + month >= current;
}

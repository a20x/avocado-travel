/**
 * Форматирование чисел для интерфейса на русском языке.
 */

const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

/** Цена из копеек: 520000 → «5 200 ₽». */
export function formatPrice(kopecks: number): string {
  return rub.format(Math.round(kopecks / 100));
}

/** Длительность: 145 → «2 ч 25 мин», 60 → «1 ч», 40 → «40 мин». */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

const pluralRules = new Intl.PluralRules('ru-RU');

/**
 * Слово в форме для числа: plural(3, ['рейс', 'рейса', 'рейсов']) → «рейса».
 * Формы — для 1, 2 и 5.
 */
export function plural(count: number, [one, few, many]: [string, string, string]): string {
  const rule = pluralRules.select(count);
  return rule === 'one' ? one : rule === 'few' ? few : many;
}

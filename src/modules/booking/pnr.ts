/**
 * Код брони (PNR): 6 символов из заглавных латинских букв и цифр без похожих —
 * без 0 и O, 1 и I (docs/02-product.md). Его диктуют по телефону и вводят руками.
 */
export const PNR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PNR_LENGTH = 6;

/** Новый код. `random` — источник случайных байтов, в тестах подменяется. */
export function generatePnr(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  // 32 символа в алфавите: 256 делится на 32 без остатка, поэтому все символы равновероятны.
  const bytes = random(new Uint8Array(PNR_LENGTH));
  return Array.from(bytes, (byte) => PNR_ALPHABET[byte % PNR_ALPHABET.length]).join('');
}

export function isPnr(value: string): boolean {
  return new RegExp(`^[${PNR_ALPHABET}]{${PNR_LENGTH}}$`).test(value);
}

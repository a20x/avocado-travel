/** Валюты конвертера: самые ходовые и валюты стран, куда летаем (docs/01-requirements.md, L1-S07). */
export const CURRENCIES = [
  { code: 'USD', name: 'Доллар США' },
  { code: 'EUR', name: 'Евро' },
  { code: 'CNY', name: 'Китайский юань' },
  { code: 'TRY', name: 'Турецкая лира' },
  { code: 'AED', name: 'Дирхам ОАЭ' },
  { code: 'AMD', name: 'Армянский драм' },
  { code: 'UZS', name: 'Узбекский сум' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

/** Валюты баннера в подвале. */
export const BANNER_CODES: CurrencyCode[] = ['USD', 'EUR', 'CNY'];

export type Rate = {
  code: CurrencyCode;
  name: string;
  /** Рублей за одну единицу валюты. */ rubles: number;
};

/** Курсы ЦБ на дату. */
export type Rates = { date: string; rates: Rate[] };

/** Самая большая сумма для пересчёта — защита от бессмысленного ввода. */
export const MAX_AMOUNT = 100_000_000;

/**
 * Разбор ежедневных курсов ЦБ (XML_daily.asp): дата и рублей за единицу каждой валюты.
 * В XML курс указан за номинал («100 армянских драмов — 21,5 ₽»), дробная часть — через запятую.
 * null — ответ не похож на курсы ЦБ.
 */
export function parseCbrXml(xml: string): Rates | null {
  const date = /<ValCurs[^>]*\sDate="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  if (!date) return null;

  const values = new Map<string, number>();
  for (const [, block = ''] of xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)) {
    const code = /<CharCode>([A-Z]{3})<\/CharCode>/.exec(block)?.[1];
    const nominal = Number(/<Nominal>(\d+)<\/Nominal>/.exec(block)?.[1]);
    const value = Number(/<Value>([\d,]+)<\/Value>/.exec(block)?.[1]?.replace(',', '.'));
    if (code && nominal > 0 && value > 0) values.set(code, value / nominal);
  }

  const rates = CURRENCIES.flatMap(({ code, name }) => {
    const rubles = values.get(code);
    return rubles ? [{ code, name, rubles }] : [];
  });
  if (rates.length === 0) return null;
  return { date: `${date[3]}-${date[2]}-${date[1]}`, rates };
}

/** Сумма в рублях из поля или адреса: «12 345,50» → 12345.5. null — не сумма. */
export function parseAmount(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const amount = Number(value.replace(/[\s ]/g, '').replace(',', '.'));
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}

/** Рубли в валюту по курсу ЦБ. */
export function convert(rubles: number, rate: Pick<Rate, 'rubles'>): number {
  return rubles / rate.rubles;
}

/** Курс для баннера: «81,23 ₽», мелкие валюты — с четырьмя знаками («0,2154 ₽»). */
export function formatRate(rubles: number): string {
  return `${rubles.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: rubles < 1 ? 4 : 2,
  })} ₽`;
}

/** Сумма в валюте со знаком: «150,25 $», «12,50 ¥», «1 234 567,80 UZS». */
export function formatMoney(amount: number, code: CurrencyCode): string {
  return amount.toLocaleString('ru-RU', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
  });
}

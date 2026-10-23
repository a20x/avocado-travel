import { describe, expect, it } from 'vitest';
import { convert, formatMoney, formatRate, parseAmount, parseCbrXml } from './model';

const XML = `<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="23.10.2026" name="Foreign Currency Market">
<Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name><Value>81,2345</Value><VunitRate>81,2345</VunitRate></Valute>
<Valute ID="R01060"><NumCode>051</NumCode><CharCode>AMD</CharCode><Nominal>100</Nominal><Name>Армянских драмов</Name><Value>21,5400</Value><VunitRate>0,2154</VunitRate></Valute>
<Valute ID="R01010"><NumCode>036</NumCode><CharCode>AUD</CharCode><Nominal>1</Nominal><Name>Австралийский доллар</Name><Value>56,9339</Value><VunitRate>56,9339</VunitRate></Valute>
</ValCurs>`;

describe('курсы ЦБ', () => {
  it('разбирает дату и курсы с учётом номинала, лишние валюты пропускает', () => {
    const rates = parseCbrXml(XML);
    expect(rates?.date).toBe('2026-10-23');
    expect(rates?.rates.map((r) => r.code)).toEqual(['USD', 'AMD']);
    expect(rates?.rates[0]?.rubles).toBeCloseTo(81.2345);
    expect(rates?.rates[1]?.rubles).toBeCloseTo(0.2154);
  });

  it('не курсы — null', () => {
    expect(parseCbrXml('<html>Ошибка</html>')).toBeNull();
    expect(parseCbrXml('<ValCurs Date="23.10.2026"></ValCurs>')).toBeNull();
  });

  it('курс для баннера', () => {
    expect(formatRate(81.2345)).toBe('81,23 ₽');
    expect(formatRate(0.2154)).toBe('0,2154 ₽');
  });
});

describe('конвертер', () => {
  it('сумма понимается с пробелами и запятой', () => {
    expect(parseAmount('12 345,50')).toBe(12345.5);
    expect(parseAmount('12 345')).toBe(12345);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('много')).toBeNull();
    expect(parseAmount('1000000000')).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it('пересчитывает рубли в валюту', () => {
    expect(convert(8123.45, { rubles: 81.2345 })).toBeCloseTo(100);
    // Между цифрами и знаком — неразрывный пробел: сравниваем, заменив его обычным.
    const plain = (text: string) => text.replace(/\s/g, ' ');
    expect(plain(formatMoney(100, 'USD'))).toBe('100,00 $');
    expect(plain(formatMoney(12.5, 'CNY'))).toBe('12,50 ¥');
    expect(plain(formatMoney(1234567.8, 'UZS'))).toBe('1 234 567,80 UZS');
  });
});

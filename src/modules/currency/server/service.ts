import 'server-only';
import { cache } from 'react';
import { fetchExternal } from '@/server/external';
import { parseCbrXml, type Rates } from '../model';

/**
 * Ежедневные курсы ЦБ РФ — официальный XML. Адрес по http: по https сайт ЦБ отвечает
 * не из всех сетей (соединение зависает на установке шифрования), а курсы — открытые данные,
 * которые на сайте показываются только для справки (docs/02-product.md, «Цены»).
 */
const CBR_URL = 'http://www.cbr.ru/scripts/XML_daily.asp';

/**
 * Курсы ЦБ или null, если ЦБ недоступен. Хранятся час (docs/03-architecture.md);
 * cache — чтобы подвал и конвертер на одной странице не запрашивали их дважды.
 */
export const getRates = cache(async (): Promise<Rates | null> => {
  const response = await fetchExternal(CBR_URL, { revalidate: 3600 });
  if (!response) return null;
  // XML ЦБ — в кодировке windows-1251.
  const xml = new TextDecoder('windows-1251').decode(await response.arrayBuffer());
  return parseCbrXml(xml);
});

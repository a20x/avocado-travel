import Link from 'next/link';
import { formatDate } from '@/shared/lib/format';
import { BANNER_CODES, formatRate, type Rates } from '../model';

/** Курсы ЦБ в подвале (L1-13). ЦБ недоступен — короткая заглушка, страница не ломается. */
export function CurrencyBanner({ rates }: { rates: Rates | null }) {
  const shown = rates?.rates.filter((rate) => BANNER_CODES.includes(rate.code)) ?? [];
  return (
    <section aria-labelledby="rates-title" className="grid content-start gap-2">
      <h2 id="rates-title" className="text-sm text-white">
        Курсы ЦБ{rates ? ` на ${formatDate(rates.date)}` : ''}
      </h2>
      {shown.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {shown.map((rate) => (
            <li key={rate.code}>
              <span className="text-line-strong">{rate.code}</span>{' '}
              <span className="font-mono text-white tabular-nums">{formatRate(rate.rubles)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-line-strong">Курсы сейчас недоступны — загляните позже.</p>
      )}
      <Link href="/services#converter" className="w-fit text-sage no-underline hover:underline">
        Конвертер валют
      </Link>
    </section>
  );
}

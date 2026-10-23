import type { Metadata } from 'next';
import { parseAmount } from '@/modules/currency';
import { getRates } from '@/modules/currency/server';
import { Converter } from '@/modules/currency/ui';
import { formatDate } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';

export const metadata: Metadata = {
  title: 'Сервисы',
  description: 'Сервисы Avocado Travel для путешественников: конвертер валют по курсу ЦБ.',
};

/** Страница сервисов (docs/02-product.md). Карта маршрутов и мировые часы добавятся в T-22. */
export default async function ServicesPage(props: PageProps<'/services'>) {
  const [params, rates] = await Promise.all([props.searchParams, getRates()]);

  return (
    <div className="container-site grid gap-8 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Сервисы</h1>
        <p className="text-slate">Полезное перед поездкой: сколько стоит билет в валюте страны.</p>
      </header>

      <section id="converter" aria-labelledby="converter-title" className="grid scroll-mt-4 gap-4">
        <div className="grid gap-1">
          <h2 id="converter-title" className="text-2xl">
            Конвертер валют
          </h2>
          <p className="text-slate">
            Цены на сайте — в рублях. Пересчёт по курсу ЦБ
            {rates ? ` на ${formatDate(rates.date)}` : ''} — только для информации.
          </p>
        </div>
        {rates ? (
          <Converter
            rates={rates}
            initialAmount={parseAmount(
              typeof params.amount === 'string' ? params.amount : undefined,
            )}
          />
        ) : (
          <Card className="p-5">
            <p>
              Курсы ЦБ сейчас недоступны, поэтому пересчитать сумму не получится. Загляните позже.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

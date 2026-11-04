import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listTimeZones, referenceReturnSchema } from '@/modules/catalog-data';
import { CityForm } from '@/modules/catalog-data/ui';

export const metadata: Metadata = { title: 'Новый город — админка', robots: { index: false } };

export default async function NewCityPage(props: PageProps<'/admin/cities/new'>) {
  await requireAdmin('/admin/cities/new');
  // Открыли кнопкой «Добавить» у списка «Откуда» или «Куда» формы рейсов — туда и вернёмся.
  const back = referenceReturnSchema.parse((await props.searchParams).return);
  const returnTo = back === 'flights-airline' ? undefined : back;

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        {returnTo ? (
          <Link href="/admin/flights/new">← К новым рейсам</Link>
        ) : (
          <Link href="/admin/cities">← Все города</Link>
        )}
      </p>
      <h1 className="text-3xl">Новый город</h1>
      {returnTo ? (
        <p className="max-w-3xl text-slate">
          Вместе с городом заводится его аэропорт. После сохранения вернётесь к форме рейсов — новый
          аэропорт уже будет выбран в списке.
        </p>
      ) : null}
      <CityForm
        returnTo={returnTo}
        timezones={listTimeZones().map((zone) => ({ value: zone, label: zone }))}
        initial={{
          name: '',
          nameFrom: '',
          nameTo: '',
          country: 'Россия',
          description: '',
          iata: '',
          airportName: '',
          lat: '',
          lon: '',
          timezone: 'Europe/Moscow',
        }}
      />
    </div>
  );
}

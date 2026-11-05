import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { referenceReturnSchema } from '@/modules/catalog-data';
import { getReferenceLists, listCities } from '@/modules/catalog-data/server';
import { AirlineForm, NEW_AIRLINE_VALUES } from '@/modules/catalog-data/ui';
import { returnPath, withBack } from '@/shared/lib/return-path';

export const metadata: Metadata = {
  title: 'Новая авиакомпания — админка',
  robots: { index: false },
};

export default async function NewAirlinePage(props: PageProps<'/admin/airlines/new'>) {
  const params = await props.searchParams;
  const back = returnPath(params.back);
  await requireAdmin(withBack('/admin/airlines/new', back));
  // Открыли кнопкой «Добавить» у списка «Авиакомпания» формы рейсов — туда и вернёмся.
  const target = referenceReturnSchema.parse(params.return);
  const returnTo = target === 'flights-airline' ? target : undefined;
  const [lists, cities] = await Promise.all([getReferenceLists(), listCities()]);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        {returnTo ? (
          <Link href={withBack('/admin/flights/new', back)}>← К новым рейсам</Link>
        ) : (
          <Link href={back ?? '/admin/airlines'}>{back ? '← Назад' : '← Все авиакомпании'}</Link>
        )}
      </p>
      <h1 className="text-3xl">Новая авиакомпания</h1>
      {returnTo ? (
        <p className="max-w-3xl text-slate">
          После сохранения вернётесь к форме рейсов — новая авиакомпания уже будет выбрана в списке.
        </p>
      ) : null}
      <AirlineForm
        returnTo={returnTo}
        back={back}
        lists={lists}
        cities={cities.map((city) => ({ value: city.slug, label: city.name }))}
        initial={NEW_AIRLINE_VALUES}
      />
    </div>
  );
}

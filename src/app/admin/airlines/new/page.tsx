import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { referenceReturnSchema } from '@/modules/catalog-data';
import { AirlineForm } from '@/modules/catalog-data/ui';

export const metadata: Metadata = {
  title: 'Новая авиакомпания — админка',
  robots: { index: false },
};

export default async function NewAirlinePage(props: PageProps<'/admin/airlines/new'>) {
  await requireAdmin('/admin/airlines/new');
  // Открыли кнопкой «Добавить» у списка «Авиакомпания» формы рейсов — туда и вернёмся.
  const back = referenceReturnSchema.parse((await props.searchParams).return);
  const returnTo = back === 'flights-airline' ? back : undefined;

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        {returnTo ? (
          <Link href="/admin/flights/new">← К новым рейсам</Link>
        ) : (
          <Link href="/admin/airlines">← Все авиакомпании</Link>
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
        initial={{ code: '', name: '', color: '#2E4A7D', description: '', baggageIncluded: false }}
      />
    </div>
  );
}

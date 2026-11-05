import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { getAirlineForEdit, getReferenceLists, listCities } from '@/modules/catalog-data/server';
import { AirlineForm } from '@/modules/catalog-data/ui';
import { returnPath, withBack } from '@/shared/lib/return-path';

export const metadata: Metadata = {
  title: 'Правка авиакомпании — админка',
  robots: { index: false },
};

export default async function EditAirlinePage(props: PageProps<'/admin/airlines/[code]/edit'>) {
  const { code } = await props.params;
  const back = returnPath((await props.searchParams).back);
  await requireAdmin(withBack(`/admin/airlines/${code}/edit`, back));
  const [airline, lists, cities] = await Promise.all([
    getAirlineForEdit(code),
    getReferenceLists(),
    listCities(),
  ]);
  if (!airline) notFound();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={back ?? '/admin/airlines'}>← Все авиакомпании</Link>
      </p>
      <h1 className="text-3xl">Правка авиакомпании</h1>
      <AirlineForm
        code={airline.code}
        back={back}
        initial={airline}
        lists={lists}
        cities={cities.map((city) => ({ value: city.slug, label: city.name }))}
      />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { getCityForEdit, getReferenceLists } from '@/modules/catalog-data/server';
import { CityForm } from '@/modules/catalog-data/ui';
import { returnPath, withBack } from '@/shared/lib/return-path';

export const metadata: Metadata = { title: 'Правка города — админка', robots: { index: false } };

export default async function EditCityPage(props: PageProps<'/admin/cities/[slug]/edit'>) {
  const { slug } = await props.params;
  const back = returnPath((await props.searchParams).back);
  await requireAdmin(withBack(`/admin/cities/${slug}/edit`, back));
  const [city, lists] = await Promise.all([getCityForEdit(slug), getReferenceLists()]);
  if (!city) notFound();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={back ?? '/admin/cities'}>← Все города</Link>
      </p>
      <h1 className="text-3xl">Правка города</h1>
      <CityForm
        slug={city.slug}
        back={back}
        lists={lists}
        initial={{ ...city, iata: '', airportName: '', lat: '', lon: '', timezone: '' }}
      />
    </div>
  );
}

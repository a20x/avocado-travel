import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { getAirlineForEdit } from '@/modules/catalog-data/server';
import { AirlineForm } from '@/modules/catalog-data/ui';

export const metadata: Metadata = {
  title: 'Правка авиакомпании — админка',
  robots: { index: false },
};

export default async function EditAirlinePage(props: PageProps<'/admin/airlines/[code]/edit'>) {
  const { code } = await props.params;
  await requireAdmin(`/admin/airlines/${code}/edit`);
  const airline = await getAirlineForEdit(code);
  if (!airline) notFound();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin/airlines">← Все авиакомпании</Link>
      </p>
      <h1 className="text-3xl">Правка авиакомпании</h1>
      <AirlineForm code={airline.code} initial={airline} />
    </div>
  );
}

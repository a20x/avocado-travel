import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listTimeZones } from '@/modules/catalog-data';
import { CityForm } from '@/modules/catalog-data/ui';

export const metadata: Metadata = { title: 'Новый город — админка', robots: { index: false } };

export default async function NewCityPage() {
  await requireAdmin('/admin/cities/new');

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin/cities">← Все города</Link>
      </p>
      <h1 className="text-3xl">Новый город</h1>
      <CityForm
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

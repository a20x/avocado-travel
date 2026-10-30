import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { AirlineForm } from '@/modules/catalog-data/ui';

export const metadata: Metadata = {
  title: 'Новая авиакомпания — админка',
  robots: { index: false },
};

export default async function NewAirlinePage() {
  await requireAdmin('/admin/airlines/new');

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin/airlines">← Все авиакомпании</Link>
      </p>
      <h1 className="text-3xl">Новая авиакомпания</h1>
      <AirlineForm
        initial={{ code: '', name: '', color: '#2E4A7D', description: '', baggageIncluded: false }}
      />
    </div>
  );
}

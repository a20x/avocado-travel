import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listAircraftModels, listAirlines, listAirports } from '@/modules/catalog-data/server';
import { FlightScheduleForm } from '@/modules/flights/ui';
import { dateInZone } from '@/shared/lib/time';

export const metadata: Metadata = { title: 'Новые рейсы — админка', robots: { index: false } };

const byLabel = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, 'ru');

export default async function NewFlightsPage() {
  await requireAdmin('/admin/flights/new');
  const [airlines, airports, models] = await Promise.all([
    listAirlines(),
    listAirports(),
    listAircraftModels(),
  ]);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin/flights">← Все рейсы</Link>
      </p>
      <h1 className="text-3xl">Новые рейсы</h1>
      <FlightScheduleForm
        today={dateInZone(new Date(), 'Europe/Moscow')}
        airlines={airlines.map((airline) => ({ value: airline.code, label: airline.name }))}
        airports={airports
          .map((airport) => ({
            value: airport.iata,
            label: `${airport.city} — ${airport.name} (${airport.iata})`,
          }))
          .sort(byLabel)}
        aircraft={models
          .map((model) => ({
            value: String(model.id),
            label: `${model.manufacturer} ${model.model}`,
          }))
          .sort(byLabel)}
      />
    </div>
  );
}

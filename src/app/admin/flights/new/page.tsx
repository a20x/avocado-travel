import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listAircraftModels, listAirlines, listAirports } from '@/modules/catalog-data/server';
import { FlightScheduleForm } from '@/modules/flights/ui';
import { returnPath, withBack } from '@/shared/lib/return-path';
import { dateInZone } from '@/shared/lib/time';

export const metadata: Metadata = { title: 'Новые рейсы — админка', robots: { index: false } };

const byLabel = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, 'ru');

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function NewFlightsPage(props: PageProps<'/admin/flights/new'>) {
  const params = await props.searchParams;
  const back = returnPath(params.back);
  await requireAdmin(withBack('/admin/flights/new', back));
  const [airlines, airports, models] = await Promise.all([
    listAirlines(),
    listAirports(),
    listAircraftModels(),
  ]);
  // Вернулись из формы «Добавить» — новое значение выбрано в своём списке. Чужое — не берём.
  const pick = (value: string | undefined, known: string[]) =>
    value && known.includes(value) ? value : undefined;
  const iatas = airports.map((airport) => airport.iata);
  const initial = {
    airline: pick(
      first(params.airline),
      airlines.map((airline) => airline.code),
    ),
    origin: pick(first(params.origin), iatas),
    destination: pick(first(params.destination), iatas),
  };

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={back ?? '/admin/flights'}>{back ? '← Назад' : '← Все рейсы'}</Link>
      </p>
      <h1 className="text-3xl">Новые рейсы</h1>
      <FlightScheduleForm
        back={back}
        initial={initial}
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

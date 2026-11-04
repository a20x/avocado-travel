import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { listAircraftModels } from '@/modules/catalog-data/server';
import { adminRouteHref } from '@/modules/flights';
import { getFlightForEdit } from '@/modules/flights/server';
import { FlightEditForm } from '@/modules/flights/ui';
import { dateInZone } from '@/shared/lib/time';

export const metadata: Metadata = { title: 'Правка рейса — админка', robots: { index: false } };

/** Правка одного рейса: дата и время вылета, время в пути, самолёт, цены. */
export default async function AdminFlightEditPage(props: PageProps<'/admin/flights/[id]/edit'>) {
  const { id } = await props.params;
  await requireAdmin(`/admin/flights/${id}/edit`);
  const [flight, models] = await Promise.all([getFlightForEdit(id), listAircraftModels()]);
  if (!flight) notFound();
  const ref = {
    airline: flight.airlineCode,
    origin: flight.originIata,
    destination: flight.destinationIata,
  };
  const now = new Date();
  const departed = flight.departsAt <= now;

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={adminRouteHref(ref)}>← Рейсы маршрута</Link>
      </p>
      <h1 className="text-3xl">
        Рейс {flight.number}: {flight.originCity} ({flight.originIata}) → {flight.destinationCity} (
        {flight.destinationIata})
      </h1>
      <p className="max-w-3xl text-slate">
        {flight.airlineName}. Авиакомпания, маршрут и номер рейса не меняются. Пассажиры с
        купленными билетами полетят в новое время; их цены остаются прежними.
      </p>
      {departed ? (
        <p role="status" className="rounded-sm bg-mist px-4 py-3">
          Рейс уже улетел — его не изменить.
        </p>
      ) : (
        <FlightEditForm
          flight={flight}
          today={dateInZone(now, flight.originTimezone)}
          aircraft={models
            .map((model) => ({
              value: String(model.id),
              label: `${model.manufacturer} ${model.model}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'ru'))}
        />
      )}
    </div>
  );
}

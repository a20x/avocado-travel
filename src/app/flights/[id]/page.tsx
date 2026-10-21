import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { AirlineLogo } from '@/modules/catalog-data/ui';
import { searchQuerySchema, searchUrl } from '@/modules/flights';
import { getFlight } from '@/modules/flights/server';
import { SeatPicker } from '@/modules/flights/ui';
import { formatDate, formatDuration, plural } from '@/shared/lib/format';
import { dateInZone, daysBetween, timeInZone } from '@/shared/lib/time';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

// Рейс нужен и для заголовка вкладки, и для страницы — cache не даёт сходить в базу дважды.
const loadFlight = cache(async (id: string) => getFlight(id));

/** Пассажиры и класс приходят из результатов поиска; без них — 1 пассажир, эконом. */
const optionsSchema = searchQuerySchema.pick({ passengers: true, cabinClass: true });

export async function generateMetadata(props: PageProps<'/flights/[id]'>): Promise<Metadata> {
  const result = await loadFlight((await props.params).id);
  if (!result.ok) return {};
  const flight = result.data;
  return { title: `${flight.number}: ${flight.origin.city} → ${flight.destination.city}` };
}

export default async function FlightPage(props: PageProps<'/flights/[id]'>) {
  const [{ id }, params] = await Promise.all([props.params, props.searchParams]);
  const result = await loadFlight(id);
  if (!result.ok) notFound();

  const flight = result.data;
  const parsed = optionsSchema.safeParse(params);
  const { passengers, cabinClass } = parsed.success
    ? parsed.data
    : { passengers: 1, cabinClass: 'economy' as const };

  const localDate = dateInZone(flight.departsAt, flight.origin.timezone);
  const dayShift = daysBetween(
    localDate,
    dateInZone(flight.arrivesAt, flight.destination.timezone),
  );
  const backHref = searchUrl({
    from: flight.origin.citySlug,
    to: flight.destination.citySlug,
    date: localDate,
    passengers,
    cabinClass,
  });
  const otherClass = cabinClass === 'economy' ? 'business' : 'economy';

  return (
    <>
      <div className="border-b border-line bg-white py-6">
        <div className="container-site grid gap-4">
          <p>
            <Link href={backHref}>← Все рейсы на эту дату</Link>
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <AirlineLogo airline={flight.airline} size={48} />
            <div>
              <h1 className="text-2xl">
                {flight.origin.city} → {flight.destination.city}
              </h1>
              <p className="text-slate">
                {flight.airline.name} · {flight.number} · {flight.aircraft.manufacturer}{' '}
                {flight.aircraft.model} · {formatDate(localDate, { weekday: true })}
              </p>
            </div>
            <div className="md:ml-auto">
              <p className="text-xl font-semibold">
                {timeInZone(flight.departsAt, flight.origin.timezone)} {flight.origin.iata} →{' '}
                {timeInZone(flight.arrivesAt, flight.destination.timezone)}
                {dayShift > 0 ? <sup className="text-sm text-pit">+{dayShift}</sup> : null}{' '}
                {flight.destination.iata}
              </p>
              <p className="text-sm text-slate">
                {formatDuration(flight.durationMinutes)} в пути · время местное
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-site py-6">
        {flight.isDeparted ? (
          <Card>
            <EmptyState
              image="/images/illustrations/no-results.svg"
              title="Этот рейс уже улетел"
              text="Выберите другую дату в поиске на главной."
              action={
                <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
                  К поиску
                </Link>
              }
            />
          </Card>
        ) : flight.seatsLeft[cabinClass] < passengers ? (
          <Card>
            <EmptyState
              image="/images/illustrations/no-results.svg"
              title="Свободных мест не хватает"
              text={`В этом классе осталось ${flight.seatsLeft[cabinClass]} ${plural(flight.seatsLeft[cabinClass], ['место', 'места', 'мест'])}.`}
              action={
                <Link href={backHref} className={buttonClasses({ variant: 'secondary' })}>
                  Другие рейсы
                </Link>
              }
            />
          </Card>
        ) : (
          <SeatPicker
            flightId={flight.id}
            cabinClass={cabinClass}
            passengers={passengers}
            seatMap={flight.seatMap}
            otherClass={{
              label: otherClass === 'business' ? 'Выбрать бизнес-класс' : 'Выбрать эконом',
              href: `/flights/${flight.id}?passengers=${passengers}&cabinClass=${otherClass}`,
            }}
          />
        )}
      </div>
    </>
  );
}

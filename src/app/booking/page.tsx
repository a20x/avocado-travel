import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/modules/auth/server';
import type { BookingError } from '@/modules/booking';
import { prepareBooking } from '@/modules/booking/server';
import { PassengersForm } from '@/modules/booking/ui';
import { formatDate } from '@/shared/lib/format';
import { dateInZone, timeInZone } from '@/shared/lib/time';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export const metadata: Metadata = { title: 'Оформление брони', robots: { index: false } };

const PROBLEMS: Record<BookingError, { title: string; text: string }> = {
  INVALID_REQUEST: {
    title: 'Места не выбраны',
    text: 'Найдите рейс и выберите места на схеме салона.',
  },
  FLIGHT_NOT_FOUND: { title: 'Рейс не найден', text: 'Найдите рейс заново в поиске.' },
  FLIGHT_DEPARTED: { title: 'Этот рейс уже улетел', text: 'Выберите другую дату в поиске.' },
  SEAT_UNAVAILABLE: {
    title: 'Выбранные места уже заняты',
    text: 'Пока вы выбирали, их забронировал кто-то другой. Вернитесь к схеме и выберите другие.',
  },
};

/** Параметры адреса как строка — чтобы после входа вернуться ровно к этому выбору мест. */
function queryString(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  return query.toString();
}

export default async function BookingPage(props: PageProps<'/booking'>) {
  const params = await props.searchParams;
  // Бронировать может только вошедший: гость уходит на вход и возвращается сюда же с теми же местами.
  await requireUser(`/booking?${queryString(params)}`);

  const draft = await prepareBooking(params);
  if (!draft.ok) {
    const problem = PROBLEMS[draft.error];
    const flightId = typeof params.flight === 'string' ? params.flight : null;
    const back =
      flightId && draft.error === 'SEAT_UNAVAILABLE'
        ? {
            href: `/flights/${flightId}?passengers=${[params.seats ?? []].flat().length}&cabinClass=${params.cabinClass}`,
            label: 'К схеме салона',
          }
        : { href: '/', label: 'К поиску' };
    return (
      <div className="container-site py-8">
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            titleAs="h1"
            title={problem.title}
            text={problem.text}
            action={
              <Link href={back.href} className={buttonClasses({ variant: 'secondary' })}>
                {back.label}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const { flight, seats, total, request } = draft.data;
  const date = dateInZone(flight.departsAt, flight.origin.timezone);

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid gap-1">
        <h1 className="text-3xl">Оформление брони</h1>
        <p className="text-slate">
          {flight.origin.city} → {flight.destination.city} · {flight.airline.name} · {flight.number}{' '}
          · {formatDate(date, { weekday: true })},{' '}
          {timeInZone(flight.departsAt, flight.origin.timezone)}
        </p>
      </header>
      <PassengersForm
        flightId={flight.id}
        cabinClass={request.cabinClass}
        seats={seats}
        total={total}
      />
    </div>
  );
}

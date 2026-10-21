import Link from 'next/link';
import { AirlineLogo } from '@/modules/catalog-data/ui';
import { formatDuration, formatPrice, plural } from '@/shared/lib/format';
import { dateInZone, daysBetween, timeInZone } from '@/shared/lib/time';
import { buttonClasses } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import type { FlightOffer } from '../model';

type FlightCardProps = {
  offer: FlightOffer;
  /** Ссылка на страницу рейса с выбором мест. */
  href: string;
  /** Самая низкая цена среди найденных — плашка «выгодно». */
  isBestPrice?: boolean;
};

/** Сколько мест показывать числом: больше — просто «много мест». */
const FEW_SEATS = 10;

function Place({
  at,
  place,
  dayShift = 0,
  align = 'left',
}: {
  at: string;
  place: FlightOffer['origin'];
  dayShift?: number;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <p className="text-xl leading-tight font-semibold md:text-2xl">
        {at}
        {dayShift > 0 ? (
          <sup className="ml-0.5 text-sm font-medium text-pit" title="Прилёт на следующий день">
            +{dayShift}
          </sup>
        ) : null}
      </p>
      <p className="text-sm text-slate">
        {place.iata}
        {/* На телефоне — только код: иначе название не помещается рядом с маршрутом. */}
        <span className="hidden md:inline"> {place.name}</span>
      </p>
    </div>
  );
}

/** Рейс в списке результатов (docs/06-design.md): маршрут — пунктир с косточкой на конце. */
export function FlightCard({ offer, href, isBestPrice = false }: FlightCardProps) {
  const departure = timeInZone(offer.departsAt, offer.origin.timezone);
  const arrival = timeInZone(offer.arrivesAt, offer.destination.timezone);
  // Время местное в каждом городе: во Владивосток из Москвы прилетают на следующий день.
  const dayShift = daysBetween(
    dateInZone(offer.departsAt, offer.origin.timezone),
    dateInZone(offer.arrivesAt, offer.destination.timezone),
  );

  return (
    <Card as="article" className="grid overflow-hidden md:grid-cols-[minmax(0,1fr)_12.5rem]">
      <div className="grid gap-4 p-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <AirlineLogo airline={offer.airline} size={32} />
          <h3 className="text-base font-semibold">{offer.airline.name}</h3>
          <span className="text-sm text-slate">
            {offer.number} · {offer.aircraft.manufacturer} {offer.aircraft.model}
          </span>
          {isBestPrice ? (
            <span className="ml-auto">
              <Badge tone="accent">выгодно</Badge>
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:gap-4">
          <Place at={departure} place={offer.origin} />
          <div className="relative text-center text-xs text-slate md:text-sm">
            <div className="mx-2.5 mb-1.5 border-t-2 border-dashed border-line-strong" />
            <span
              aria-hidden="true"
              className="absolute -top-[5px] right-0 size-3 rounded-full bg-pit"
            />
            <span className="block whitespace-nowrap">{formatDuration(offer.durationMinutes)}</span>
            <span className="hidden whitespace-nowrap md:block">без пересадок</span>
          </div>
          <Place at={arrival} place={offer.destination} dayShift={dayShift} align="right" />
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate">
          <span>
            {offer.airline.baggageIncluded ? 'Багаж 23 кг включён' : 'Ручная кладь 10 кг'}
          </span>
          <span>
            {offer.seatsLeft < FEW_SEATS
              ? `Осталось ${offer.seatsLeft} ${plural(offer.seatsLeft, ['место', 'места', 'мест'])}`
              : 'Много мест'}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 md:grid md:content-center md:justify-stretch md:gap-2 md:border-t-0 md:border-l md:p-5 md:text-center">
        <div>
          <p className="text-xl font-semibold md:text-2xl">{formatPrice(offer.price)}</p>
          <p className="text-sm text-slate">за пассажира</p>
        </div>
        <Link href={href} className={buttonClasses()}>
          Выбрать места
        </Link>
      </div>
    </Card>
  );
}

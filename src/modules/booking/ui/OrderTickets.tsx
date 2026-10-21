import { formatDate, formatPrice } from '@/shared/lib/format';
import { dateInZone, timeInZone } from '@/shared/lib/time';
import { Card } from '@/shared/ui/Card';
import type { OrderDetails } from '../model';

const CLASS_NAME = { economy: 'эконом', business: 'бизнес' } as const;

/** Рейс и билеты заказа: на странице брони и (в T-14) в личном кабинете. */
export function OrderTickets({ order }: { order: OrderDetails }) {
  const { flight } = order;
  const departureDate = dateInZone(flight.departsAt, flight.origin.timezone);

  return (
    <Card as="section" aria-labelledby={`order-${order.id}`} className="grid gap-4 p-4 md:p-6">
      <div>
        <h2 id={`order-${order.id}`} className="text-xl">
          {flight.origin.city} → {flight.destination.city}
        </h2>
        <p className="text-slate">
          {flight.airlineName} · {flight.number} · {formatDate(departureDate, { weekday: true })} ·{' '}
          {timeInZone(flight.departsAt, flight.origin.timezone)} {flight.origin.iata} →{' '}
          {timeInZone(flight.arrivesAt, flight.destination.timezone)} {flight.destination.iata}
        </p>
      </div>
      <ul className="grid gap-2">
        {order.tickets.map((ticket) => (
          <li
            key={ticket.seat}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-2"
          >
            <span>
              {ticket.passengerFirstName} {ticket.passengerLastName}
              <span className="block text-sm text-slate">
                место {ticket.seat}, {CLASS_NAME[order.cabinClass]}
              </span>
            </span>
            <span className="whitespace-nowrap">{formatPrice(ticket.price)}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
        <span>Итого</span>
        <span>{formatPrice(order.total)}</span>
      </p>
    </Card>
  );
}

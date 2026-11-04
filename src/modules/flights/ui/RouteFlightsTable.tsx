import Link from 'next/link';
import { formatDuration, formatPrice } from '@/shared/lib/format';
import { Table } from '@/shared/ui/Table';
import { durationOf, type FlightEditView } from '../edit';

const local = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(at);

/** Предстоящие рейсы маршрута в админке: у каждого — «Изменить». */
export function RouteFlightsTable({
  flights,
  page,
  totalPages,
}: {
  flights: FlightEditView[];
  page: number;
  totalPages: number;
}) {
  return (
    <Table caption={`Предстоящие рейсы, страница ${page} из ${totalPages}`}>
      <thead>
        <tr>
          <th scope="col">Вылет, местное</th>
          <th scope="col">Рейс</th>
          <th scope="col">В пути</th>
          <th scope="col">Самолёт</th>
          <th scope="col">Эконом</th>
          <th scope="col">Бизнес</th>
          <th scope="col">Продано мест</th>
          <th scope="col">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {flights.map((flight) => (
          <tr key={flight.id}>
            <td className="whitespace-nowrap tabular-nums">
              {local(flight.departsAt, flight.originTimezone)}
            </td>
            <td className="whitespace-nowrap">{flight.number}</td>
            <td className="whitespace-nowrap">{formatDuration(durationOf(flight))}</td>
            <td>{flight.aircraft}</td>
            <td className="whitespace-nowrap tabular-nums">{formatPrice(flight.priceEconomy)}</td>
            <td className="whitespace-nowrap tabular-nums">{formatPrice(flight.priceBusiness)}</td>
            <td className="tabular-nums">{flight.heldSeats}</td>
            <td>
              <Link href={`/admin/flights/${flight.id}/edit`}>
                Изменить<span className="sr-only"> рейс {flight.number}</span>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

import Link from 'next/link';
import { plural } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { Table } from '@/shared/ui/Table';
import type { AirlineAdminRow, CityAdminRow } from '../model';
import { deleteAirlineAction, deleteCityAction } from '../server/actions';
import { AirlineLogo } from './AirlineLogo';

const flightsLabel = (count: number) =>
  `${count.toLocaleString('ru-RU')} ${plural(count, ['рейс', 'рейса', 'рейсов'])}`;

/** Города в админке по алфавиту: аэропорты, число рейсов, правка и удаление. */
export function CityTable({ cities }: { cities: CityAdminRow[] }) {
  return (
    <Table caption="Города по алфавиту">
      <thead>
        <tr>
          <th scope="col">Город</th>
          <th scope="col">Страна</th>
          <th scope="col">Аэропорты</th>
          <th scope="col">Рейсы</th>
          <th scope="col">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {cities.map((city) => (
          <tr key={city.slug}>
            <td>
              <Link href={`/destinations/${city.slug}`}>{city.name}</Link>
            </td>
            <td>{city.country}</td>
            <td>{city.airports.join(', ')}</td>
            <td className="whitespace-nowrap">{flightsLabel(city.flights)}</td>
            <td>
              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                <Link
                  href={`/admin/cities/${city.slug}/edit`}
                  className={buttonClasses({ variant: 'ghost' })}
                >
                  Изменить<span className="sr-only">: {city.name}</span>
                </Link>
                <ConfirmButton
                  label="Удалить"
                  title="Удалить город?"
                  text={
                    city.flights > 0
                      ? `У города «${city.name}» есть рейсы — сначала удалите их в разделе «Рейсы».`
                      : `Город «${city.name}» и его аэропорты исчезнут из всех списков сайта.`
                  }
                  confirmLabel="Удалить"
                  action={deleteCityAction}
                  permalink="/admin/cities"
                >
                  <input type="hidden" name="slug" value={city.slug} />
                </ConfirmButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Авиакомпании в админке по алфавиту: число рейсов, правка и удаление. */
export function AirlineTable({ airlines }: { airlines: AirlineAdminRow[] }) {
  return (
    <Table caption="Авиакомпании по алфавиту">
      <thead>
        <tr>
          <th scope="col">Авиакомпания</th>
          <th scope="col">Код</th>
          <th scope="col">Рейсы</th>
          <th scope="col">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {airlines.map((airline) => (
          <tr key={airline.code}>
            <td>
              <span className="flex items-center gap-3">
                <AirlineLogo airline={airline} size={28} />
                {airline.name}
              </span>
            </td>
            <td>{airline.code}</td>
            <td className="whitespace-nowrap">{flightsLabel(airline.flights)}</td>
            <td>
              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                <Link
                  href={`/admin/airlines/${airline.code}/edit`}
                  className={buttonClasses({ variant: 'ghost' })}
                >
                  Изменить<span className="sr-only">: {airline.name}</span>
                </Link>
                <ConfirmButton
                  label="Удалить"
                  title="Удалить авиакомпанию?"
                  text={
                    airline.flights > 0
                      ? `У авиакомпании «${airline.name}» есть рейсы — сначала удалите их в разделе «Рейсы».`
                      : `Авиакомпания «${airline.name}» исчезнет из всех списков сайта.`
                  }
                  confirmLabel="Удалить"
                  action={deleteAirlineAction}
                  permalink="/admin/airlines"
                >
                  <input type="hidden" name="code" value={airline.code} />
                </ConfirmButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

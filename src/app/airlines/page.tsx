import type { Metadata } from 'next';
import { connection } from 'next/server';
import { AirlineLogo, seatCapacity } from '@/modules/catalog-data';
import { listAircraftModels, listAirlines } from '@/modules/catalog-data/server';
import { listAirlineStats } from '@/modules/flights/server';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Table } from '@/shared/ui/Table';

export const metadata: Metadata = {
  title: 'Авиакомпании',
  description: 'Авиакомпании Avocado Travel: маршруты, города, багаж и самолёты.',
};

/** Компоновка ряда для людей: `ABC-DEF` → «3–3». */
const seatsPerSide = (layout: string) =>
  layout
    .split('-')
    .map((group) => group.length)
    .join('–');

export default async function AirlinesPage() {
  // Статистика считается по рейсам ближайшей недели — страница собирается на каждый запрос.
  await connection();
  const [airlines, aircraft, stats] = await Promise.all([
    listAirlines(),
    listAircraftModels(),
    listAirlineStats(),
  ]);

  return (
    <div className="container-site grid gap-10 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Авиакомпании</h1>
        <p className="text-slate">
          Билеты на сайте продаются на рейсы шести авиакомпаний. Перевозчики выдуманные, а города,
          аэропорты и самолёты — настоящие.
        </p>
      </header>

      <section className="grid gap-4">
        <h2 className="text-2xl">Перевозчики</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {airlines.map((airline) => (
            <Card as="article" key={airline.code} className="grid content-start gap-3 p-5">
              <div className="flex items-center gap-3">
                <AirlineLogo airline={airline} size={48} />
                <div>
                  <h3 className="text-lg">{airline.name}</h3>
                  <p className="text-sm text-slate">Код {airline.code}</p>
                </div>
              </div>
              <p>{airline.description}</p>
              <p>
                <Badge tone={airline.baggageIncluded ? 'success' : 'muted'}>
                  {airline.baggageIncluded ? 'Багаж включён' : 'Только ручная кладь'}
                </Badge>
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-2xl">Сравнение</h2>
        <Table caption="Авиакомпании на ближайшую неделю">
          <thead>
            <tr>
              <th scope="col">Авиакомпания</th>
              <th scope="col">Маршрутов</th>
              <th scope="col">Городов</th>
              <th scope="col">Рейсов в неделю</th>
              <th scope="col">Багаж в цене</th>
              <th scope="col">Самолёты</th>
            </tr>
          </thead>
          <tbody>
            {airlines.map((airline) => {
              const s = stats.get(airline.code);
              return (
                <tr key={airline.code}>
                  <td>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <AirlineLogo airline={airline} size={24} />
                      {airline.name}
                    </span>
                  </td>
                  <td>{s?.routes ?? 0}</td>
                  <td>{s?.cities ?? 0}</td>
                  <td>{s?.flightsPerWeek ?? 0}</td>
                  <td>{airline.baggageIncluded ? 'да' : 'нет'}</td>
                  <td className="whitespace-nowrap">
                    {s?.fleet.map((a) => `${a.manufacturer} ${a.model}`).join(', ') || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </section>

      <section className="grid gap-4">
        <h2 className="text-2xl">Флот</h2>
        <Table caption="Модели самолётов и вместимость">
          <thead>
            <tr>
              <th scope="col">Самолёт</th>
              <th scope="col">Бизнес</th>
              <th scope="col">Эконом</th>
              <th scope="col">Всего мест</th>
              <th scope="col">Кресел в ряду</th>
              <th scope="col">Авиакомпании</th>
            </tr>
          </thead>
          <tbody>
            {aircraft.map((model) => {
              const seats = seatCapacity(model);
              const operators = airlines.filter((airline) =>
                stats
                  .get(airline.code)
                  ?.fleet.some(
                    (a) => a.manufacturer === model.manufacturer && a.model === model.model,
                  ),
              );
              return (
                <tr key={model.id}>
                  <td className="whitespace-nowrap">
                    {model.manufacturer} {model.model}
                  </td>
                  <td>{seats.business}</td>
                  <td>{seats.economy}</td>
                  <td>{seats.business + seats.economy}</td>
                  <td className="whitespace-nowrap">
                    {seatsPerSide(model.businessLayout)} / {seatsPerSide(model.economyLayout)}
                  </td>
                  <td>{operators.map((airline) => airline.name).join(', ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <p className="text-sm text-slate">
          Кресел в ряду — сколько кресел слева и справа от прохода: в бизнес-классе / в экономе.
        </p>
      </section>
    </div>
  );
}

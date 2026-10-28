'use client';

// Клиентский компонент: при смене авиакомпании список городов сужается сразу, без отправки формы.
import { useState } from 'react';
import { Select, type SelectOption } from '@/shared/ui/Select';
import type { RoutePair } from '../model';

/**
 * Связанные списки «Авиакомпания» и «Направление»: в каждом — только сочетания, для которых
 * есть рейсы. Сервер присылает уже суженные списки (так они работают и без JavaScript —
 * кнопкой «Обновить списки»), а здесь списки сужаются заново при каждом выборе.
 */
export function RouteSelects({
  airlines,
  destinations,
  pairs,
  airline,
  destination,
}: {
  airlines: SelectOption[];
  destinations: SelectOption[];
  pairs: RoutePair[];
  airline: string;
  destination: string;
}) {
  const [selectedAirline, setAirline] = useState(airline);
  const [selectedDestination, setDestination] = useState(destination);

  const servedBy = (code: string) =>
    !selectedDestination ||
    pairs.some((pair) => pair.airline === code && pair.destination === selectedDestination);
  const flownTo = (slug: string) =>
    !selectedAirline ||
    pairs.some((pair) => pair.destination === slug && pair.airline === selectedAirline);

  return (
    <>
      <Select
        name="airline"
        label="Авиакомпания"
        value={selectedAirline}
        onChange={(event) => setAirline(event.target.value)}
        options={[
          { value: '', label: 'Все авиакомпании' },
          ...airlines.filter((option) => servedBy(option.value)),
        ]}
      />
      <Select
        name="to"
        label="Направление"
        value={selectedDestination}
        onChange={(event) => setDestination(event.target.value)}
        options={[
          { value: '', label: 'Все направления' },
          ...destinations.filter((option) => flownTo(option.value)),
        ]}
      />
    </>
  );
}

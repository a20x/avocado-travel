'use client';

import { useState } from 'react';
import { formatDate } from '@/shared/lib/format';
import { dateInZone, timeInZone, utcOffsetLabel } from '@/shared/lib/time';
import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { formatDifference, zoneDifference, type ClockCity } from '../model';
import { useNow } from './useNow';

type WorldClockProps = {
  cities: ClockCity[];
  defaultFrom: string;
  defaultTo: string;
  /** Время сервера, мс: первая отрисовка в браузере совпадает с серверной. */
  initialNow: number;
};

function CityTime({ city, now, label }: { city: ClockCity; now: Date; label: string }) {
  return (
    <div className="grid gap-1 rounded-sm bg-mist p-4">
      <span className="text-sm text-slate">{label}</span>
      <span className="text-lg font-semibold">{city.name}</span>
      <time
        dateTime={now.toISOString()}
        className="font-mono text-4xl font-semibold tabular-nums"
        suppressHydrationWarning
      >
        {timeInZone(now, city.timezone)}
      </time>
      <span className="text-sm text-slate" suppressHydrationWarning>
        {formatDate(dateInZone(now, city.timezone), { weekday: true })} ·{' '}
        {utcOffsetLabel(city.timezone, now)}
      </span>
    </div>
  );
}

/** Мировые часы (L1-S09): время в городах вылета и прилёта и разница поясов. */
export function WorldClock({ cities, defaultFrom, defaultTo, initialNow }: WorldClockProps) {
  const now = useNow(initialNow);
  const [fromSlug, setFromSlug] = useState(defaultFrom);
  const [toSlug, setToSlug] = useState(defaultTo);
  const from = cities.find((city) => city.slug === fromSlug) ?? cities[0];
  const to = cities.find((city) => city.slug === toSlug) ?? cities[0];
  if (!from || !to) return null;

  const options = cities.map((city) => ({ value: city.slug, label: city.name }));
  const difference = zoneDifference(from.timezone, to.timezone, now);

  return (
    <Card className="grid gap-5 p-4 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="clockFrom"
          label="Город вылета"
          options={options}
          value={from.slug}
          onChange={(event) => setFromSlug(event.target.value)}
        />
        <Select
          name="clockTo"
          label="Город прилёта"
          options={options}
          value={to.slug}
          onChange={(event) => setToSlug(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CityTime city={from} now={now} label="Вылет" />
        <CityTime city={to} now={now} label="Прилёт" />
      </div>
      <p aria-live="polite" className="text-lg">
        Разница поясов: <b>{formatDifference(difference)}</b>
        {difference !== 0 ? (
          <span className="text-slate">
            {' '}
            — в городе «{to.name}» {difference > 0 ? 'позже' : 'раньше'}, чем в городе «{from.name}»
          </span>
        ) : null}
      </p>
    </Card>
  );
}

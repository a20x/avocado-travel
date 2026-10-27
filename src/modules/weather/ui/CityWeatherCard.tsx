import type { ReactNode } from 'react';
import { formatDate } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { describeWeather, formatTemperature, type CityWeather } from '../model';
import { WeatherIcon } from './WeatherIcon';

/**
 * Погода в городе (L1-12): сейчас и на ближайшие дни, время местное. На странице направления
 * и на странице «Погода»; там под заголовком — где город (`area`), а справа — кнопка
 * «В мои города» (`actions`).
 */
export function CityWeatherCard({
  weather,
  cityName,
  area,
  actions,
}: {
  weather: CityWeather | null;
  cityName: string;
  area?: string;
  actions?: ReactNode;
}) {
  // Заголовок, где город и кнопка — и когда прогноза нет: отметить город можно и тогда.
  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <h2 id="city-weather-title" className="text-xl">
          {weather || area !== undefined ? `Погода: ${cityName}` : 'Погода'}
        </h2>
        {area ? <p className="text-sm text-slate">{area}</p> : null}
      </div>
      {actions}
    </div>
  );

  if (!weather) {
    return (
      <Card as="section" aria-labelledby="city-weather-title" className="grid gap-2 p-5">
        {header}
        <p className="text-slate">Прогноз сейчас недоступен — загляните позже.</p>
      </Card>
    );
  }

  const now = describeWeather(weather.code);
  return (
    <Card as="section" aria-labelledby="city-weather-title" className="grid gap-4 p-5 md:p-6">
      {header}
      <div className="flex flex-wrap items-center gap-4">
        <WeatherIcon kind={now.kind} className="size-14" />
        <div>
          <p className="text-3xl font-semibold tabular-nums">
            {formatTemperature(weather.temperature)}
          </p>
          <p className="text-slate">
            {now.label},{' '}
            {weather.wind < 0.5 ? 'безветренно' : `ветер ${Math.round(weather.wind)} м/с`}
          </p>
          <p className="text-sm text-slate">
            Ощущается как {formatTemperature(weather.feelsLike)}, влажность{' '}
            {Math.round(weather.humidity)}%
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-2 border-t border-line pt-4">
        {weather.days.map((day, i) => {
          const { label, kind } = describeWeather(day.code);
          return (
            <li key={day.date} className="grid justify-items-center gap-1 text-center">
              <span className="text-sm text-slate">
                {i === 0 ? 'Сегодня' : formatDate(day.date)}
              </span>
              <WeatherIcon kind={kind} className="size-8" />
              <span className="sr-only">{label}</span>
              <span className="tabular-nums">
                {formatTemperature(day.max)}{' '}
                <span className="text-slate">{formatTemperature(day.min)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate">
        Данные:{' '}
        <a href="https://open-meteo.com/" rel="noopener">
          Open-Meteo
        </a>
      </p>
    </Card>
  );
}

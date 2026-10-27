import Link from 'next/link';
import { Card } from '@/shared/ui/Card';
import { describeWeather, formatTemperature, type CityWeather } from '../model';
import { WeatherIcon } from './WeatherIcon';

/**
 * Баннер погоды на главной (L1-12): сейчас в нескольких городах — в отмеченных посетителем
 * на странице «Погода» (`mine`) или, пока их нет, в городах с разным климатом.
 */
export function WeatherWidget({
  weather,
  mine = false,
}: {
  weather: CityWeather[] | null;
  mine?: boolean;
}) {
  return (
    <Card
      as="section"
      aria-labelledby="weather-title"
      className="grid content-start gap-4 p-5 md:p-6"
    >
      <div className="grid gap-0.5">
        <h2 id="weather-title" className="text-xl">
          Погода сейчас
        </h2>
        {mine ? <p className="text-sm text-slate">В ваших городах</p> : null}
      </div>
      {weather && weather.length > 0 ? (
        <ul className="grid gap-3">
          {weather.map((city) => {
            const { label, kind } = describeWeather(city.code);
            return (
              <li key={city.slug} className="flex items-center gap-3">
                <WeatherIcon kind={kind} />
                <div className="min-w-0 flex-1">
                  <Link href={city.href} className="font-semibold">
                    {city.name}
                  </Link>
                  <p className="text-sm text-slate">{label}</p>
                </div>
                <span className="text-xl font-semibold tabular-nums">
                  {formatTemperature(city.temperature)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-slate">Прогноз сейчас недоступен — загляните позже.</p>
      )}
      <Link href="/weather" className="text-sm">
        {mine ? 'Все мои города' : 'Погода в любом городе'} →
      </Link>
      <p className="text-xs text-slate">
        Данные:{' '}
        <a href="https://open-meteo.com/" rel="noopener">
          Open-Meteo
        </a>
      </p>
    </Card>
  );
}

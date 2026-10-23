import { formatDate } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { describeWeather, formatTemperature, type CityWeather } from '../model';
import { WeatherIcon } from './WeatherIcon';

/** Погода на странице направления (L1-12): сейчас и на ближайшие дни, время местное. */
export function CityWeatherCard({
  weather,
  cityName,
}: {
  weather: CityWeather | null;
  cityName: string;
}) {
  if (!weather) {
    return (
      <Card as="section" aria-labelledby="city-weather-title" className="grid gap-2 p-5">
        <h2 id="city-weather-title" className="text-xl">
          Погода
        </h2>
        <p className="text-slate">Прогноз сейчас недоступен — загляните позже.</p>
      </Card>
    );
  }

  const now = describeWeather(weather.code);
  return (
    <Card as="section" aria-labelledby="city-weather-title" className="grid gap-4 p-5 md:p-6">
      <h2 id="city-weather-title" className="text-xl">
        Погода: {cityName}
      </h2>
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

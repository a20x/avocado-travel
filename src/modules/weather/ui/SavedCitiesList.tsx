import Link from 'next/link';
import { ActionForm } from '@/shared/ui/ActionForm';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import {
  MAX_SAVED_CITIES,
  describeWeather,
  formatTemperature,
  weatherCityHref,
  type CityWeather,
  type GeoCity,
} from '../model';
import { forgetCityAction } from '../server/actions';
import { WeatherIcon } from './WeatherIcon';

/**
 * «Мои города» на странице «Погода»: погода сейчас в каждом отмеченном городе и кнопка
 * «Удалить». Если прогноз недоступен, список всё равно виден — города можно убрать.
 */
export function SavedCitiesList({
  cities,
  weather,
  permalink,
}: {
  cities: GeoCity[];
  weather: CityWeather[] | null;
  permalink: string;
}) {
  return (
    <Card as="section" aria-labelledby="saved-cities-title" className="grid gap-4 p-5 md:p-6">
      <div className="grid gap-1">
        <h2 id="saved-cities-title" className="text-xl">
          Мои города
        </h2>
        <p className="text-sm text-slate">
          {cities.length > 0
            ? `${cities.length} из ${MAX_SAVED_CITIES}. Список хранится в этом браузере.`
            : 'Найдите город и нажмите «В мои города» — здесь будет погода сразу во всех.'}
        </p>
      </div>
      {cities.length > 0 ? (
        <ul className="grid gap-1">
          {cities.map((city, i) => {
            const now = weather?.[i];
            const described = now ? describeWeather(now.code) : null;
            return (
              <li
                key={city.id}
                className="flex items-center gap-3 border-t border-line pt-2 first:border-0 first:pt-0"
              >
                {described ? <WeatherIcon kind={described.kind} /> : null}
                <div className="min-w-0 flex-1">
                  <Link href={weatherCityHref(city.id)} className="font-semibold">
                    {city.name}
                  </Link>
                  <p className="truncate text-sm text-slate">
                    {described ? described.label : city.area || 'Прогноз недоступен'}
                  </p>
                </div>
                {now ? (
                  <span className="text-xl font-semibold tabular-nums">
                    {formatTemperature(now.temperature)}
                  </span>
                ) : null}
                <ActionForm action={forgetCityAction} permalink={permalink}>
                  <input type="hidden" name="city" value={city.id} />
                  <Button type="submit" variant="ghost" className="px-3">
                    <span aria-hidden="true">✕</span>
                    <span className="sr-only">Удалить {city.name} из моих городов</span>
                  </Button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      ) : null}
      {weather === null && cities.length > 0 ? (
        <p className="text-sm text-slate">Прогноз сейчас недоступен — загляните позже.</p>
      ) : null}
    </Card>
  );
}

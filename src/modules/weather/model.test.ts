import { describe, expect, it } from 'vitest';
import {
  HOME_WEATHER_COUNT,
  MAX_SAVED_CITIES,
  addSavedCity,
  citySearchUrl,
  citySuggestQuery,
  describeWeather,
  forecastUrl,
  formatTemperature,
  geoPlace,
  homeWeatherPlaces,
  parseCity,
  parseCitySearch,
  parseForecast,
  parseSavedCities,
  removeSavedCity,
  setHomeCity,
  type GeoCity,
  type SavedCity,
} from './model';

const KALININGRAD = { slug: 'kaliningrad', name: 'Калининград', lat: 54.89, lon: 20.5926 };
const SOCHI = { slug: 'sochi', name: 'Сочи', lat: 43.4499, lon: 39.9566 };

const forecast = (temperature: number) => ({
  current: {
    temperature_2m: temperature,
    apparent_temperature: temperature - 2,
    relative_humidity_2m: 81,
    weather_code: 61,
    wind_speed_10m: 3.4,
  },
  daily: {
    time: ['2026-10-23', '2026-10-24'],
    weather_code: [61, 0],
    temperature_2m_max: [13.2, 11.9],
    temperature_2m_min: [8.8, 6.1],
  },
});

describe('погода', () => {
  it('коды WMO — описание и значок', () => {
    expect(describeWeather(0)).toEqual({ label: 'Ясно', kind: 'clear' });
    expect(describeWeather(63)).toEqual({ label: 'Дождь', kind: 'rain' });
    expect(describeWeather(75).kind).toBe('snow');
    expect(describeWeather(999)).toEqual({ label: 'Облачно', kind: 'cloudy' });
  });

  it('температура со знаком и настоящим минусом', () => {
    expect(formatTemperature(11.7)).toBe('+12°');
    expect(formatTemperature(-3.2)).toBe('−3°');
    expect(formatTemperature(-0.4)).toBe('0°');
  });

  it('один запрос на все города', () => {
    const url = new URL(forecastUrl([KALININGRAD, SOCHI]));
    expect(url.searchParams.get('latitude')).toBe('54.8900,43.4499');
    expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
  });

  it('разбирает ответ на несколько городов и на один', () => {
    const many = parseForecast([forecast(11.7), forecast(21)], [KALININGRAD, SOCHI]);
    expect(many?.map((w) => [w.slug, w.temperature])).toEqual([
      ['kaliningrad', 11.7],
      ['sochi', 21],
    ]);
    expect(many?.[0]?.days[1]).toEqual({ date: '2026-10-24', code: 0, max: 11.9, min: 6.1 });

    expect(parseForecast(forecast(5), [SOCHI])?.[0]).toMatchObject({
      name: 'Сочи',
      href: '/destinations/sochi',
      feelsLike: 3,
      humidity: 81,
    });
  });

  it('неожиданный ответ — null', () => {
    expect(parseForecast({ error: true, reason: 'Ошибка' }, [SOCHI])).toBeNull();
    expect(parseForecast([forecast(1)], [KALININGRAD, SOCHI])).toBeNull();
  });
});

const PARIS: GeoCity = {
  id: 2988507,
  name: 'Париж',
  area: 'Иль-де-Франс, Франция',
  lat: 48.85,
  lon: 2.35,
};
const city = (id: number): GeoCity => ({ ...PARIS, id, name: `Город ${id}` });
/** Город из «Моих городов»: в cookie у него ещё и отметка «На главную». */
const saved = (id: number, home = false): SavedCity => ({ ...city(id), home });
const SAVED_PARIS: SavedCity = { ...PARIS, home: false };

describe('погода в любом городе', () => {
  it('поиск города — по-русски, не больше десяти', () => {
    const url = new URL(citySearchUrl('пари'));
    expect(url.hostname).toBe('geocoding-api.open-meteo.com');
    expect(url.searchParams.get('name')).toBe('пари');
    expect(url.searchParams.get('language')).toBe('ru');
    expect(url.searchParams.get('count')).toBe('10');
  });

  it('ответ геокодера: город, область и страна без повторов', () => {
    const moscow = {
      id: 524901,
      name: 'Москва',
      latitude: 55.75,
      longitude: 37.62,
      admin1: 'Москва',
      country: 'Россия',
    };
    expect(parseCitySearch({ results: [moscow, { id: 'битый' }] })).toEqual([
      { id: 524901, name: 'Москва', area: 'Россия', lat: 55.75, lon: 37.62 },
    ]);
    expect(parseCity({ ...moscow, admin1: 'Московская область' })?.area).toBe(
      'Московская область, Россия',
    );
  });

  it('ничего не нашлось — пустой список, странный ответ — null', () => {
    expect(parseCitySearch({ generationtime_ms: 0.1 })).toEqual([]);
    expect(parseCitySearch('ошибка')).toBeNull();
    expect(parseCity({ error: true })).toBeNull();
  });

  it('мои города из cookie: битые записи, повторы и лишние отбрасываются', () => {
    expect(parseSavedCities('не список')).toEqual([]);
    // Старая cookie — без отметки «На главную»: город не на главной.
    expect(parseSavedCities([PARIS, PARIS, { ...PARIS, id: 2, lat: 500 }, { id: 3 }])).toEqual([
      SAVED_PARIS,
    ]);
    const many = Array.from({ length: MAX_SAVED_CITIES + 3 }, (_, i) => city(i + 1));
    expect(parseSavedCities(many)).toHaveLength(MAX_SAVED_CITIES);
  });

  it('из cookie на главную — не больше четырёх отметок, лишние снимаются', () => {
    const all = Array.from({ length: 6 }, (_, i) => saved(i + 1, true));
    const home = parseSavedCities(all).filter((c) => c.home);
    expect(home.map((c) => c.id)).toEqual([1, 2, 3, 4]);
    expect(HOME_WEATHER_COUNT).toBe(4);
  });

  it('добавить: в конец и не на главную, повтор не дублируется, больше десяти нельзя', () => {
    const one = addSavedCity([saved(1)], PARIS);
    expect(one.ok && one.data).toEqual([saved(1), SAVED_PARIS]);
    expect(addSavedCity([SAVED_PARIS], PARIS)).toEqual({ ok: true, data: [SAVED_PARIS] });

    const full = Array.from({ length: MAX_SAVED_CITIES }, (_, i) => saved(i + 1));
    expect(addSavedCity(full, PARIS)).toEqual({ ok: false, error: 'LIMIT' });
  });

  it('удалить и показать: название ведёт на погоду в городе', () => {
    expect(removeSavedCity([saved(1), SAVED_PARIS], PARIS.id)).toEqual([saved(1)]);
    expect(geoPlace(PARIS)).toMatchObject({ name: 'Париж', href: '/weather?city=2988507' });
  });

  it('подсказки городов — от двух букв, без пробелов по краям', () => {
    expect(citySuggestQuery('  об ')).toBe('об');
    expect(citySuggestQuery('о')).toBeNull();
    expect(citySuggestQuery(null)).toBeNull();
    expect(citySuggestQuery('я'.repeat(150))).toHaveLength(100);
  });
});

describe('города на главной', () => {
  const place = (name: string) => ({ slug: name, name, lat: 0, lon: 0 });
  const DEFAULTS = ['Обнинск', 'Сочи', 'Санкт-Петербург', 'Владивосток', 'Калининград'].map(place);
  const names = (list: { name: string }[]) => list.map((p) => p.name);

  it('отметить «На главную» и снять отметку', () => {
    const marked = setHomeCity([saved(1), saved(2)], 2, true);
    expect(marked.ok && marked.data).toEqual([saved(1), saved(2, true)]);
    const unmarked = setHomeCity([saved(1, true)], 1, false);
    expect(unmarked.ok && unmarked.data).toEqual([saved(1)]);
  });

  it('пятый город на главную не встаёт, чужой город — ошибка', () => {
    const four = [1, 2, 3, 4].map((id) => saved(id, true));
    expect(setHomeCity([...four, saved(5)], 5, true)).toEqual({ ok: false, error: 'HOME_LIMIT' });
    // Снять отметку можно и при полной главной.
    expect(setHomeCity(four, 1, false).ok).toBe(true);
    expect(setHomeCity(four, 99, true)).toEqual({ ok: false, error: 'NOT_SAVED' });
  });

  it('без своих городов — первые четыре стандартных', () => {
    const result = homeWeatherPlaces([saved(1)], DEFAULTS);
    expect(names(result.places)).toEqual(['Обнинск', 'Сочи', 'Санкт-Петербург', 'Владивосток']);
    expect(result.mine).toBe(0);
  });

  it('свои — первыми, остальные места — стандартные по порядку', () => {
    const result = homeWeatherPlaces([saved(1), saved(2, true)], DEFAULTS);
    expect(names(result.places)).toEqual(['Город 2', 'Обнинск', 'Сочи', 'Санкт-Петербург']);
    expect(result.mine).toBe(1);
    expect(result.places[0]?.href).toBe('/weather?city=2');
  });

  it('стандартный город с тем же названием второй раз не показывается', () => {
    const sochi: SavedCity = { ...saved(7, true), name: 'сочи' };
    const result = homeWeatherPlaces([sochi], DEFAULTS);
    expect(names(result.places)).toEqual(['сочи', 'Обнинск', 'Санкт-Петербург', 'Владивосток']);
  });

  it('четыре своих — стандартных нет', () => {
    const four = [1, 2, 3, 4].map((id) => saved(id, true));
    expect(names(homeWeatherPlaces(four, DEFAULTS).places)).toEqual([
      'Город 1',
      'Город 2',
      'Город 3',
      'Город 4',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  MAX_SAVED_CITIES,
  addSavedCity,
  citySearchUrl,
  describeWeather,
  forecastUrl,
  formatTemperature,
  geoPlace,
  parseCity,
  parseCitySearch,
  parseForecast,
  parseSavedCities,
  removeSavedCity,
  type GeoCity,
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
    expect(parseSavedCities([PARIS, PARIS, { ...PARIS, id: 2, lat: 500 }, { id: 3 }])).toEqual([
      PARIS,
    ]);
    const many = Array.from({ length: MAX_SAVED_CITIES + 3 }, (_, i) => city(i + 1));
    expect(parseSavedCities(many)).toHaveLength(MAX_SAVED_CITIES);
  });

  it('добавить: в конец, повтор не дублируется, больше десяти нельзя', () => {
    const one = addSavedCity([city(1)], PARIS);
    expect(one.ok && one.data.map((c) => c.id)).toEqual([1, PARIS.id]);
    expect(addSavedCity([PARIS], PARIS)).toEqual({ ok: true, data: [PARIS] });

    const full = Array.from({ length: MAX_SAVED_CITIES }, (_, i) => city(i + 1));
    expect(addSavedCity(full, PARIS)).toEqual({ ok: false, error: 'LIMIT' });
  });

  it('удалить и показать: название ведёт на погоду в городе', () => {
    expect(removeSavedCity([city(1), PARIS], PARIS.id)).toEqual([city(1)]);
    expect(geoPlace(PARIS)).toMatchObject({ name: 'Париж', href: '/weather?city=2988507' });
  });
});

import { describe, expect, it } from 'vitest';
import { describeWeather, forecastUrl, formatTemperature, parseForecast } from './model';

const KALININGRAD = { slug: 'kaliningrad', name: 'Калининград', lat: 54.89, lon: 20.5926 };
const SOCHI = { slug: 'sochi', name: 'Сочи', lat: 43.4499, lon: 39.9566 };

const forecast = (temperature: number) => ({
  current: { temperature_2m: temperature, weather_code: 61, wind_speed_10m: 3.4 },
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

    expect(parseForecast(forecast(5), [SOCHI])?.[0]?.name).toBe('Сочи');
  });

  it('неожиданный ответ — null', () => {
    expect(parseForecast({ error: true, reason: 'Ошибка' }, [SOCHI])).toBeNull();
    expect(parseForecast([forecast(1)], [KALININGRAD, SOCHI])).toBeNull();
  });
});

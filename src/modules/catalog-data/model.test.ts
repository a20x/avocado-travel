import { describe, expect, it } from 'vitest';
import {
  airlineInputSchema,
  cityInputSchema,
  isTimeZone,
  listTimeZones,
  newAirlineSchema,
  newCitySchema,
} from './model';

const city = {
  name: 'Мурманск',
  nameFrom: 'Мурманска',
  nameTo: 'Мурманск',
  country: 'Россия',
  description: '',
};
const airport = {
  iata: 'mmk',
  airportName: 'Мурманск',
  lat: '68,78',
  lon: '32.75',
  timezone: 'Europe/Moscow',
};

const errorPaths = (result: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[] }> };
}) => (result.success ? [] : (result.error?.issues ?? []).map((issue) => String(issue.path[0])));

describe('форма города', () => {
  it('принимает новый город с аэропортом: код — заглавными, координата — и с запятой', () => {
    const parsed = newCitySchema.parse({ ...city, ...airport });
    expect(parsed.iata).toBe('MMK');
    expect(parsed.lat).toBe(68.78);
    expect(parsed.description).toBe('');
  });

  it('не принимает название без букв, неверный код, координаты вне Земли и чужой пояс', () => {
    expect(errorPaths(cityInputSchema.safeParse({ ...city, name: '---' }))).toContain('name');
    expect(errorPaths(newCitySchema.safeParse({ ...city, ...airport, iata: 'MM1' }))).toContain(
      'iata',
    );
    expect(errorPaths(newCitySchema.safeParse({ ...city, ...airport, lat: '95' }))).toContain(
      'lat',
    );
    expect(errorPaths(newCitySchema.safeParse({ ...city, ...airport, lon: 'восток' }))).toContain(
      'lon',
    );
    expect(
      errorPaths(newCitySchema.safeParse({ ...city, ...airport, timezone: 'Mars/Olympus' })),
    ).toContain('timezone');
  });

  it('при правке аэропорт не нужен', () => {
    expect(cityInputSchema.safeParse(city).success).toBe(true);
  });
});

describe('часовые пояса', () => {
  it('знает пояса IANA и даёт их список по алфавиту', () => {
    expect(isTimeZone('Asia/Vladivostok')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
    const zones = listTimeZones();
    expect(zones).toContain('Europe/Moscow');
    expect([...zones].sort()).toEqual(zones);
  });
});

describe('форма авиакомпании', () => {
  const airline = {
    name: 'Нордавиа',
    color: '#336699',
    description: 'Рейсы на север: Мурманск и Архангельск.',
    baggageIncluded: 'on',
  };

  it('принимает новую авиакомпанию: код — заглавными, флажок багажа — в true', () => {
    const parsed = newAirlineSchema.parse({ ...airline, code: 'nrd' });
    expect(parsed.code).toBe('NRD');
    expect(parsed.baggageIncluded).toBe(true);
    expect(airlineInputSchema.parse({ ...airline, baggageIncluded: '' }).baggageIncluded).toBe(
      false,
    );
  });

  it('код — ровно три латинские буквы, цвет — в формате #RRGGBB', () => {
    expect(errorPaths(newAirlineSchema.safeParse({ ...airline, code: 'NR' }))).toContain('code');
    expect(errorPaths(newAirlineSchema.safeParse({ ...airline, code: 'НРД' }))).toContain('code');
    expect(errorPaths(airlineInputSchema.safeParse({ ...airline, color: 'red' }))).toContain(
      'color',
    );
  });
});

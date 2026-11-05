import { describe, expect, it } from 'vitest';
import {
  airlineInputSchema,
  cityInputSchema,
  isTimeZone,
  mergeOptions,
  newAirlineSchema,
  newCitySchema,
  newReferenceValueSchema,
  referenceReturnHref,
  referenceReturnSchema,
} from './model';

const city = {
  name: 'Мурманск',
  nameFrom: 'Мурманска',
  nameTo: 'Мурманск',
  country: 'Россия',
  worldPart: 'Европа',
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
  it('знает пояса IANA', () => {
    expect(isTimeZone('Asia/Vladivostok')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
  });
});

describe('форма авиакомпании', () => {
  const airline = {
    name: 'Нордавиа',
    color: '#336699',
    country: 'Россия',
    carrierType: 'Лоукост',
    baseCitySlug: 'moscow',
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

describe('кнопка «Добавить» в форме рейсов: возврат после сохранения', () => {
  it('возвращает в форму рейсов с новым значением в нужном списке', () => {
    expect(referenceReturnHref('flights-airline', 'NRD', '/database?report=input')).toBe(
      '/admin/flights/new?airline=NRD&back=%2Fdatabase%3Freport%3Dinput',
    );
    expect(referenceReturnHref('flights-airline', 'NRD')).toBe('/admin/flights/new?airline=NRD');
    expect(referenceReturnHref('flights-origin', 'MMK')).toBe('/admin/flights/new?origin=MMK');
    expect(referenceReturnHref('flights-destination', 'MMK')).toBe(
      '/admin/flights/new?destination=MMK',
    );
  });

  it('принимает только свои цели — чужой адрес не станет переадресацией', () => {
    expect(referenceReturnSchema.parse('flights-origin')).toBe('flights-origin');
    expect(referenceReturnSchema.parse(['flights-airline', 'x'])).toBe('flights-airline');
    expect(referenceReturnSchema.parse('https://evil.example')).toBeUndefined();
    expect(referenceReturnSchema.parse(null)).toBeUndefined();
    expect(referenceReturnSchema.parse(undefined)).toBeUndefined();
  });
});

describe('новое значение списка из окна «Добавить»', () => {
  it('страну принимает без лишних пробелов', () => {
    expect(newReferenceValueSchema.parse({ kind: 'country', value: '  Грузия ' }).value).toBe(
      'Грузия',
    );
  });

  it('не принимает пустое значение и значение без букв', () => {
    expect(newReferenceValueSchema.safeParse({ kind: 'country', value: ' ' }).success).toBe(false);
    expect(newReferenceValueSchema.safeParse({ kind: 'airline_type', value: '123' }).success).toBe(
      false,
    );
  });

  it('часовой пояс — только настоящий и в правильном написании', () => {
    expect(newReferenceValueSchema.parse({ kind: 'timezone', value: 'asia/tokyo' }).value).toBe(
      'Asia/Tokyo',
    );
    expect(newReferenceValueSchema.safeParse({ kind: 'timezone', value: 'Обнинск' }).success).toBe(
      false,
    );
  });

  it('не принимает чужой вид списка и новые части света', () => {
    expect(newReferenceValueSchema.safeParse({ kind: 'users', value: 'Иван' }).success).toBe(false);
    expect(
      newReferenceValueSchema.safeParse({ kind: 'world_part', value: 'Атлантида' }).success,
    ).toBe(false);
  });
});

describe('варианты списка с кнопкой «+ Добавить»', () => {
  const option = (value: string) => ({ value, label: value });

  it('новое значение встаёт по алфавиту', () => {
    expect(mergeOptions([option('Армения'), option('Китай')], [option('Грузия')])).toEqual([
      option('Армения'),
      option('Грузия'),
      option('Китай'),
    ]);
  });

  it('значение, добавленное дважды подряд, в списке одно', () => {
    expect(mergeOptions([option('Китай')], [option('Грузия'), option('Грузия')])).toEqual([
      option('Грузия'),
      option('Китай'),
    ]);
  });

  it('значение, которое уже пришло из базы, не повторяется', () => {
    expect(mergeOptions([option('Грузия')], [option('Грузия')])).toEqual([option('Грузия')]);
  });
});

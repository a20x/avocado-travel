import { describe, expect, it } from 'vitest';
import {
  adminRouteHref,
  editDuplicateMessage,
  findRepeatedFlight,
  flightEditHref,
  flightEditReturn,
  flightEditSchema,
  planFlightEdit,
  planRouteEdit,
  routeEditSchema,
  savedReturnHref,
  type EditableFlight,
} from './edit';

const now = new Date('2027-02-10T09:00:00Z');

/** Форма маршрута: пустое поле — «не менять». */
const empty = {
  aircraftModelId: '',
  departureTime: '',
  durationMinutes: '',
  priceEconomy: '',
  priceBusiness: '',
};

/** Рейс Москва → …: вылет в 10:00 по Москве (07:00 UTC), 2 ч в пути. */
const flight = (overrides: Partial<EditableFlight> = {}): EditableFlight => ({
  id: 'f1',
  number: 'NRD 100',
  airlineId: 1,
  originId: 10,
  destinationId: 20,
  aircraftModelId: 3,
  departsAt: new Date('2027-02-12T07:00:00Z'),
  arrivesAt: new Date('2027-02-12T09:00:00Z'),
  priceEconomy: 800_000,
  priceBusiness: 2_000_000,
  originTimezone: 'Europe/Moscow',
  heldSeats: 0,
  ...overrides,
});

const form = (overrides: Record<string, string> = {}) =>
  flightEditSchema.parse({
    departureDate: '2027-02-12',
    departureTime: '12:30',
    durationMinutes: '150',
    aircraftModelId: '3',
    priceEconomy: '9000',
    priceBusiness: '21000',
    ...overrides,
  });

describe('правка одного рейса', () => {
  it('время — местное аэропорта вылета, прилёт — по времени в пути, цены — в копейках', () => {
    const result = planFlightEdit(flight(), form(), now);
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: 'f1',
        departsAt: new Date('2027-02-12T09:30:00Z'),
        arrivesAt: new Date('2027-02-12T12:00:00Z'),
        priceEconomy: 900_000,
        priceBusiness: 2_100_000,
      }),
    });
  });

  it('улетевший рейс не меняется, новое время — только в будущем', () => {
    expect(planFlightEdit(flight({ departsAt: now }), form(), now)).toEqual({
      ok: false,
      error: 'DEPARTED',
    });
    expect(planFlightEdit(flight(), form({ departureDate: '2027-02-09' }), now)).toEqual({
      ok: false,
      error: 'DATE_IN_PAST',
    });
  });

  it('на рейсе с проданными местами самолёт не меняется, остальное — можно', () => {
    const sold = flight({ heldSeats: 5 });
    expect(planFlightEdit(sold, form({ aircraftModelId: '4' }), now)).toEqual({
      ok: false,
      error: 'AIRCRAFT_HAS_TICKETS',
    });
    expect(planFlightEdit(sold, form(), now).ok).toBe(true);
  });

  it('форма: бизнес дешевле эконома и пустые поля — ошибки', () => {
    const parsed = flightEditSchema.safeParse({
      departureDate: '',
      departureTime: '25:00',
      durationMinutes: '',
      aircraftModelId: '',
      priceEconomy: '9000',
      priceBusiness: '100',
    });
    expect(parsed.success).toBe(false);
    const fields = parsed.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining([
        'departureDate',
        'departureTime',
        'durationMinutes',
        'aircraftModelId',
      ]),
    );
  });
});

describe('правка всех предстоящих рейсов маршрута', () => {
  const flights = [
    flight({ id: 'past', departsAt: new Date('2027-02-09T07:00:00Z') }),
    flight(),
    flight({
      id: 'f2',
      departsAt: new Date('2027-02-13T07:00:00Z'),
      arrivesAt: new Date('2027-02-13T09:10:00Z'),
    }),
  ];

  it('пустые поля не меняются, время — то же местное в тот же день, улетевшие не трогаются', () => {
    const result = planRouteEdit(
      flights,
      routeEditSchema.parse({
        aircraftModelId: '',
        departureTime: '18:45',
        durationMinutes: '',
        priceEconomy: '9500',
        priceBusiness: '',
      }),
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((item) => item.id)).toEqual(['f1', 'f2']);
    expect(result.data[1]).toMatchObject({
      aircraftModelId: 3,
      departsAt: new Date('2027-02-13T15:45:00Z'),
      // Время в пути у рейса своё — 2 ч 10 мин.
      arrivesAt: new Date('2027-02-13T17:55:00Z'),
      priceEconomy: 950_000,
      priceBusiness: 2_000_000,
    });
  });

  it('хотя бы одно поле должно быть заполнено', () => {
    const parsed = routeEditSchema.safeParse({
      aircraftModelId: '',
      departureTime: '',
      durationMinutes: '',
      priceEconomy: '',
      priceBusiness: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('самолёт не меняется, если хоть на один рейс проданы места', () => {
    const sold = [flight(), flight({ id: 'f2', heldSeats: 1 })];
    expect(
      planRouteEdit(sold, routeEditSchema.parse({ ...empty, aircraftModelId: '4' }), now),
    ).toEqual({
      ok: false,
      error: 'AIRCRAFT_HAS_TICKETS',
    });
  });

  it('только эконом дороже бизнеса — ошибка; без предстоящих рейсов — менять нечего', () => {
    expect(
      planRouteEdit(flights, routeEditSchema.parse({ ...empty, priceEconomy: '30000' }), now),
    ).toEqual({
      ok: false,
      error: 'BUSINESS_CHEAPER',
    });
    expect(
      planRouteEdit([flights[0]!], routeEditSchema.parse({ ...empty, priceEconomy: '9000' }), now),
    ).toEqual({
      ok: false,
      error: 'NO_UPCOMING',
    });
  });
});

describe('дубли и адреса при правке', () => {
  it('два рейса маршрута получили одно время — дубль', () => {
    const a = { ...flight(), arrivesAt: new Date(0) };
    expect(findRepeatedFlight([a, { ...a, id: 'f2' }])?.id).toBe('f2');
    expect(
      findRepeatedFlight([a, { ...a, id: 'f2', departsAt: new Date('2027-02-13T07:00:00Z') }]),
    ).toBeNull();
  });

  it('сообщение называет рейс и время по Москве', () => {
    expect(editDuplicateMessage({ count: 1, first: flight() })).toBe(
      'Рейс NRD 100 уже вылетает 12.02.2027 в 10:00 по Москве по этому маршруту. Изменения не сохранены: выберите другое время вылета.',
    );
  });

  it('адрес маршрута в админке', () => {
    const route = { airline: 'STV', origin: 'SVO', destination: 'LED' };
    expect(adminRouteHref(route, { page: 2 })).toBe(
      '/admin/flights/route?airline=STV&origin=SVO&destination=LED&page=2',
    );
    expect(adminRouteHref(route, {}, '/admin/flights/route/edit')).toBe(
      '/admin/flights/route/edit?airline=STV&origin=SVO&destination=LED',
    );
  });
});

describe('возврат после правки рейса', () => {
  it('принимает результаты вкладки «БД» и страницу маршрута — с параметрами', () => {
    expect(flightEditReturn('/database?report=airline&airline=ORN&page=3')).toBe(
      '/database?report=airline&airline=ORN&page=3',
    );
    expect(flightEditReturn('/admin/flights/route?airline=ALT&origin=VVO&destination=SVO')).toBe(
      '/admin/flights/route?airline=ALT&origin=VVO&destination=SVO',
    );
  });

  it('чужой адрес и другие страницы не принимает', () => {
    for (const value of [
      undefined,
      ['/database'],
      '',
      'https://evil.example/database',
      '//evil.example/database',
      '/\\evil.example/database',
      '/admin/users',
      '/database/../admin',
    ]) {
      expect(flightEditReturn(value)).toBeUndefined();
    }
  });

  it('старая отметка «сохранено» не переносится, новая ставится при сохранении', () => {
    expect(flightEditReturn('/database?report=flights&saved=1')).toBe('/database?report=flights');
    expect(savedReturnHref('/database?report=airline&page=2')).toBe(
      '/database?report=airline&page=2&saved=1',
    );
  });

  it('адрес правки несёт, куда вернуться', () => {
    expect(flightEditHref('f1')).toBe('/admin/flights/f1/edit');
    expect(flightEditHref('f1', '/database?report=airline&airline=ORN')).toBe(
      '/admin/flights/f1/edit?back=%2Fdatabase%3Freport%3Dairline%26airline%3DORN',
    );
  });
});

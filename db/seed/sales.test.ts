import { describe, expect, it } from 'vitest';
import { seatClass } from '@/modules/catalog-data';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import { MONTH_FACTOR, SALES_DAYS, planSales, type SalesFlight, type SalesModel } from './sales';

const TODAY = '2026-10-23';
const MODEL: SalesModel = {
  id: 1,
  businessRows: 3,
  businessLayout: 'AC-DF',
  economyRows: 24,
  economyLayout: 'ABC-DEF',
};

// Каждый день — по три рейса в Сочи и в Казань, с полугода назад до полутора месяцев вперёд.
const FLIGHTS: SalesFlight[] = [];
for (let day = -SALES_DAYS - 1; day <= 46; day++) {
  for (const [hour, destination] of [
    ['07:00', 'sochi'],
    ['13:00', 'sochi'],
    ['19:00', 'sochi'],
    ['09:00', 'kazan'],
    ['15:00', 'kazan'],
    ['21:00', 'kazan'],
  ] as const) {
    FLIGHTS.push({
      id: `${day}-${hour}-${destination}`,
      departsAt: zonedTimeToUtc(addDays(TODAY, day), hour, 'Europe/Moscow'),
      durationMinutes: destination === 'sochi' ? 150 : 95,
      destination,
      priceEconomy: 600_000,
      priceBusiness: 1_800_000,
      aircraftModelId: MODEL.id,
    });
  }
}

const plan = planSales(FLIGHTS, [MODEL], TODAY);
const flightById = new Map(FLIGHTS.map((flight) => [flight.id, flight]));
const todayStart = zonedTimeToUtc(TODAY, '00:00', 'Europe/Moscow');

describe('демо-продажи', () => {
  it('одинаковые данные при каждом запуске', () => {
    const again = planSales(FLIGHTS, [MODEL], TODAY);
    expect(again.orders.length).toBe(plan.orders.length);
    expect(again.orders.slice(0, 50)).toEqual(plan.orders.slice(0, 50));
  });

  it('одно место рейса — не больше одного действующего билета, класс места совпадает', () => {
    const active = new Set<string>();
    for (const ticket of plan.orders.flatMap((order) => order.tickets)) {
      expect(seatClass(MODEL, ticket.seat)).toBe(ticket.cabinClass);
      if (!ticket.isActive) continue;
      const key = `${ticket.flightId}:${ticket.seat}`;
      expect(active.has(key), key).toBe(false);
      active.add(key);
    }
  });

  it('сумма заказа — сумма билетов, цена — по схеме салона с доплатой за место для ног', () => {
    for (const order of plan.orders) {
      expect(order.total).toBe(order.tickets.reduce((sum, ticket) => sum + ticket.price, 0));
      for (const ticket of order.tickets) {
        const base = ticket.cabinClass === 'business' ? 1_800_000 : 600_000;
        expect([base, base + 90_000]).toContain(ticket.price);
      }
    }
  });

  it('события по порядку: заказ → оплата → отмена, всё до вылета и до сегодняшнего дня', () => {
    for (const order of plan.orders) {
      const departsAt = flightById.get(order.tickets[0]?.flightId ?? '')?.departsAt;
      expect(departsAt).toBeDefined();
      expect(order.createdAt < todayStart).toBe(true);
      expect(order.createdAt.getTime()).toBeLessThan((departsAt?.getTime() ?? 0) - 3_600_000);
      expect(order.paidAt && order.paidAt > order.createdAt).toBe(true);
      if (order.status === 'cancelled') {
        expect(order.tickets.every((ticket) => !ticket.isActive)).toBe(true);
        expect(order.cancelledAt && order.paidAt && order.cancelledAt >= order.paidAt).toBe(true);
        expect(order.cancelledAt && departsAt && order.cancelledAt <= departsAt).toBe(true);
      } else {
        expect(order.tickets.every((ticket) => ticket.isActive)).toBe(true);
        expect(order.cancelledAt).toBeNull();
      }
    }
  });

  it('около 8% отмен, от одного до четырёх пассажиров, коды брони не повторяются', () => {
    const cancelled = plan.orders.filter((order) => order.status === 'cancelled').length;
    expect(cancelled / plan.orders.length).toBeGreaterThan(0.06);
    expect(cancelled / plan.orders.length).toBeLessThan(0.1);
    for (const order of plan.orders) {
      expect(order.tickets.length).toBeGreaterThanOrEqual(1);
      expect(order.tickets.length).toBeLessThanOrEqual(4);
    }
    expect(new Set(plan.orders.map((order) => order.pnr)).size).toBe(plan.orders.length);
  });

  it('летом продаж больше, чем весной: сезонность видна в данных', () => {
    const perMonth = (month: string) =>
      plan.orders.filter((order) => order.createdAt.toISOString().startsWith(month)).length;
    expect(MONTH_FACTOR[6]).toBeGreaterThan(MONTH_FACTOR[4] ?? 0);
    expect(perMonth('2026-07')).toBeGreaterThan(perMonth('2026-05') * 1.2);
  });

  it('первый пассажир — сам покупатель', () => {
    for (const order of plan.orders.slice(0, 200)) {
      const customer = plan.customers[order.customer];
      const first = order.tickets[0];
      expect(`${first?.passengerFirstName} ${first?.passengerLastName}`).toBe(customer?.name);
    }
  });
});

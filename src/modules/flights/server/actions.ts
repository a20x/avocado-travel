'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import { flightScheduleSchema, type FlightScheduleError } from '../schedule';
import * as service from './service';

export type FlightScheduleFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Введённое — чтобы после ошибки не набирать заново. Дни недели — через запятую. */
  values?: Record<string, string>;
};

const MESSAGES: Record<FlightScheduleError, string> = {
  UNKNOWN_AIRLINE: 'Такой авиакомпании нет — возможно, её только что удалили.',
  UNKNOWN_AIRPORT: 'Такого аэропорта нет — возможно, город только что удалили.',
  UNKNOWN_AIRCRAFT: 'Такого самолёта нет в справочнике.',
  SAME_CITY: 'Аэропорты вылета и прилёта — в одном городе. Выберите другой город.',
  DATE_IN_PAST: 'Рейсы заводятся с сегодняшнего дня: прошедшие даты не подходят.',
  NO_DATES: 'В выбранном периоде нет отмеченных дней недели — ни одного рейса не получилось.',
  ROUTE_NOT_FOUND: 'Рейсов этого маршрута уже нет — возможно, их удалили.',
  HAS_TICKETS: 'На рейсы маршрута проданы билеты — такие рейсы удалить нельзя.',
};

/** Ошибка, которая относится к одному полю, показывается под ним. */
const FIELD_OF: Partial<Record<FlightScheduleError, string>> = {
  SAME_CITY: 'destination',
  DATE_IN_PAST: 'dateFrom',
  NO_DATES: 'weekdays',
};

const FIELDS = [
  'airline',
  'origin',
  'destination',
  'aircraftModelId',
  'departureTime',
  'dateFrom',
  'dateTo',
  'durationMinutes',
  'priceEconomy',
  'priceBusiness',
  'withReturn',
];

export async function createFlightsAction(
  _: FlightScheduleFormState,
  formData: FormData,
): Promise<FlightScheduleFormState> {
  // Права — в каждом action: страница админки уже проверила, но запрос можно отправить и в обход неё.
  await requireAdmin();
  const fields = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? '')]),
  );
  const weekdays = formData.getAll('weekdays').map(String);
  const values = { ...fields, weekdays: weekdays.join(',') };

  const parsed = flightScheduleSchema.safeParse({ ...fields, weekdays });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  const result = await service.createFlights(parsed.data);
  if (!result.ok) {
    const field = FIELD_OF[result.error];
    return field
      ? { fieldErrors: { [field]: MESSAGES[result.error] }, values }
      : { error: MESSAGES[result.error], values };
  }
  redirect(`/admin/flights?created=${result.data.flights}`);
}

export async function deleteRouteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await service.deleteRoute({
    airline: String(formData.get('airline') ?? ''),
    origin: String(formData.get('origin') ?? ''),
    destination: String(formData.get('destination') ?? ''),
  });
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect(`/admin/flights?deleted=${result.data.flights}`);
}

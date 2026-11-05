'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import {
  adminRouteHref,
  editDuplicateMessage,
  flightEditReturn,
  flightEditSchema,
  routeEditSchema,
  savedReturnHref,
  type FlightEditError,
} from '../edit';
import { duplicateMessage, flightScheduleSchema, type FlightScheduleError } from '../schedule';
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
  DUPLICATE: 'Такие рейсы уже заведены. Измените даты, дни недели или время вылета.',
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
  if (!result.ok && result.error === 'DUPLICATE') {
    return { error: duplicateMessage(result.duplicates), values };
  }
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

/*
 * Правка рейсов: один рейс и все предстоящие рейсы маршрута.
 */

const EDIT_MESSAGES: Record<FlightEditError, string> = {
  NOT_FOUND: 'Рейс или маршрут не найден — возможно, его удалили.',
  DEPARTED: 'Рейс уже улетел — его не изменить.',
  NO_UPCOMING: 'У маршрута нет предстоящих рейсов — менять нечего.',
  DATE_IN_PAST: 'Новое время вылета уже прошло. Выберите время в будущем.',
  AIRCRAFT_HAS_TICKETS:
    'На рейсы с проданными билетами самолёт не меняется: в другом салоне проданных мест может не оказаться.',
  BUSINESS_CHEAPER:
    'После изменения бизнес у части рейсов станет дешевле эконома — укажите и цену бизнеса.',
  UNKNOWN_AIRCRAFT: 'Такого самолёта нет в справочнике.',
  DUPLICATE: 'В это время по маршруту уже вылетает другой рейс. Выберите другое время.',
};

const EDIT_FIELD_OF: Partial<Record<FlightEditError, string>> = {
  DATE_IN_PAST: 'departureTime',
  AIRCRAFT_HAS_TICKETS: 'aircraftModelId',
  BUSINESS_CHEAPER: 'priceBusiness',
  UNKNOWN_AIRCRAFT: 'aircraftModelId',
};

const FLIGHT_EDIT_FIELDS = [
  'departureDate',
  'departureTime',
  'durationMinutes',
  'aircraftModelId',
  'priceEconomy',
  'priceBusiness',
];
const ROUTE_EDIT_FIELDS = [
  'aircraftModelId',
  'departureTime',
  'durationMinutes',
  'priceEconomy',
  'priceBusiness',
];

function issuesToFields(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function editFailure(
  result: { error: FlightEditError; duplicates?: Parameters<typeof editDuplicateMessage>[0] },
  values: Record<string, string>,
): FlightScheduleFormState {
  if (result.error === 'DUPLICATE' && result.duplicates) {
    return { error: editDuplicateMessage(result.duplicates), values };
  }
  const field = EDIT_FIELD_OF[result.error];
  return field
    ? { fieldErrors: { [field]: EDIT_MESSAGES[result.error] }, values }
    : { error: EDIT_MESSAGES[result.error], values };
}

/**
 * Правка одного рейса: после сохранения — туда, откуда пришли на правку (результаты вкладки «БД»
 * или страница маршрута), а без адреса возврата — на страницу маршрута.
 */
export async function updateFlightAction(
  _: FlightScheduleFormState,
  formData: FormData,
): Promise<FlightScheduleFormState> {
  await requireAdmin();
  const values = Object.fromEntries(
    FLIGHT_EDIT_FIELDS.map((field) => [field, String(formData.get(field) ?? '')]),
  );
  const parsed = flightEditSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: issuesToFields(parsed.error.issues), values };

  const result = await service.updateFlight(String(formData.get('id') ?? ''), parsed.data);
  if (!result.ok) return editFailure(result, values);
  const back = flightEditReturn(formData.get('back'));
  redirect(back ? savedReturnHref(back) : adminRouteHref(result.data.route, { saved: 1 }));
}

/** Правка всех предстоящих рейсов маршрута: пустые поля не меняются. */
export async function updateRouteAction(
  _: FlightScheduleFormState,
  formData: FormData,
): Promise<FlightScheduleFormState> {
  await requireAdmin();
  const values = Object.fromEntries(
    ROUTE_EDIT_FIELDS.map((field) => [field, String(formData.get(field) ?? '')]),
  );
  const parsed = routeEditSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: issuesToFields(parsed.error.issues), values };

  const route = {
    airline: formData.get('airline'),
    origin: formData.get('origin'),
    destination: formData.get('destination'),
  };
  const result = await service.updateRoute(route, parsed.data);
  if (!result.ok) return editFailure(result, values);
  redirect(adminRouteHref(result.data.route, { updated: result.data.flights }));
}

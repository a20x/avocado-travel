'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import type { ActionState } from '@/shared/ui/ActionForm';
import {
  airlineInputSchema,
  cityInputSchema,
  newAirlineSchema,
  newCitySchema,
  type CatalogDataError,
} from '../model';
import * as service from './service';

export type ReferenceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Введённое — чтобы после ошибки не набирать заново. */
  values?: Record<string, string>;
};

const MESSAGES: Record<CatalogDataError, string> = {
  NOT_FOUND: 'Запись не найдена — возможно, её уже удалили.',
  CITY_EXISTS: 'Такой город уже есть в списке.',
  IATA_TAKEN: 'Аэропорт с таким кодом уже есть.',
  CODE_TAKEN: 'Этот код уже занят другой авиакомпанией.',
  NAME_TAKEN: 'Авиакомпания с таким названием уже есть.',
  HAS_FLIGHTS: 'Сначала удалите рейсы: пока они есть, удалить запись нельзя.',
};

/** Ошибка, которая относится к одному полю, показывается под ним. */
const FIELD_OF: Partial<Record<CatalogDataError, string>> = {
  CITY_EXISTS: 'name',
  IATA_TAKEN: 'iata',
  CODE_TAKEN: 'code',
  NAME_TAKEN: 'name',
};

const CITY_FIELDS = ['name', 'nameFrom', 'nameTo', 'country', 'description'];
const AIRPORT_FIELDS = ['iata', 'airportName', 'lat', 'lon', 'timezone'];
const AIRLINE_FIELDS = ['code', 'name', 'color', 'description', 'baggageIncluded'];

function readForm(formData: FormData, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? '')]));
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}

function failure(error: CatalogDataError, values: Record<string, string>): ReferenceFormState {
  const field = FIELD_OF[error];
  return field
    ? { fieldErrors: { [field]: MESSAGES[error] }, values }
    : { error: MESSAGES[error], values };
}

/** Город: со `slug` в форме — правка, без — новый город с аэропортом. */
export async function saveCityAction(
  _: ReferenceFormState,
  formData: FormData,
): Promise<ReferenceFormState> {
  // Права — в каждом action: страница админки уже проверила, но запрос можно отправить и в обход неё.
  await requireAdmin();
  const slug = String(formData.get('slug') ?? '');
  const values = readForm(formData, slug ? CITY_FIELDS : [...CITY_FIELDS, ...AIRPORT_FIELDS]);

  let result;
  if (slug) {
    const parsed = cityInputSchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
    result = await service.updateCity(slug, parsed.data);
  } else {
    const parsed = newCitySchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
    result = await service.createCity(parsed.data);
  }
  if (!result.ok) return failure(result.error, values);
  redirect(`/admin/cities?saved=${encodeURIComponent(result.data.slug)}`);
}

export async function deleteCityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await service.deleteCity(String(formData.get('slug') ?? ''));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect('/admin/cities?deleted=1');
}

/** Авиакомпания: с `currentCode` в форме — правка, без — новая. */
export async function saveAirlineAction(
  _: ReferenceFormState,
  formData: FormData,
): Promise<ReferenceFormState> {
  await requireAdmin();
  const currentCode = String(formData.get('currentCode') ?? '');
  const values = readForm(formData, AIRLINE_FIELDS);

  let result;
  if (currentCode) {
    const parsed = airlineInputSchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
    result = await service.updateAirline(currentCode, parsed.data);
  } else {
    const parsed = newAirlineSchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
    result = await service.createAirline(parsed.data);
  }
  if (!result.ok) return failure(result.error, values);
  redirect(`/admin/airlines?saved=${encodeURIComponent(result.data.code)}`);
}

export async function deleteAirlineAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = await service.deleteAirline(String(formData.get('code') ?? ''));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect('/admin/airlines?deleted=1');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { returnPath, withParams } from '@/shared/lib/return-path';
import type { ActionState } from '@/shared/ui/ActionForm';
import {
  airlineInputSchema,
  cityInputSchema,
  newAirlineSchema,
  newCitySchema,
  newReferenceValueSchema,
  referenceReturnHref,
  referenceReturnSchema,
  type CatalogDataError,
} from '../model';
import * as service from './service';

export type ReferenceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Введённое — чтобы после ошибки не набирать заново. */
  values?: Record<string, string>;
  /** Город сохранён из окна кнопки «Добавить»: форма выберет его в своём списке. */
  saved?: { value: string; label: string };
};

const MESSAGES: Record<CatalogDataError, string> = {
  NOT_FOUND: 'Запись не найдена — возможно, её уже удалили.',
  CITY_EXISTS: 'Такой город уже есть в списке.',
  IATA_TAKEN: 'Аэропорт с таким кодом уже есть.',
  CODE_TAKEN: 'Этот код уже занят другой авиакомпанией.',
  NAME_TAKEN: 'Авиакомпания с таким названием уже есть.',
  HAS_FLIGHTS: 'Сначала удалите рейсы: пока они есть, удалить запись нельзя.',
  HAS_AIRLINES:
    'Этот город — базовый у авиакомпании. Сначала выберите для неё другой город или удалите её.',
  UNKNOWN_COUNTRY: 'Выберите страну из списка.',
  UNKNOWN_WORLD_PART: 'Выберите часть света из списка.',
  UNKNOWN_TIMEZONE: 'Выберите часовой пояс из списка.',
  UNKNOWN_CARRIER_TYPE: 'Выберите тип авиакомпании из списка.',
  UNKNOWN_BASE_CITY: 'Выберите базовый город из списка.',
};

/** Ошибка, которая относится к одному полю, показывается под ним. */
const FIELD_OF: Partial<Record<CatalogDataError, string>> = {
  CITY_EXISTS: 'name',
  IATA_TAKEN: 'iata',
  CODE_TAKEN: 'code',
  NAME_TAKEN: 'name',
  UNKNOWN_COUNTRY: 'country',
  UNKNOWN_WORLD_PART: 'worldPart',
  UNKNOWN_TIMEZONE: 'timezone',
  UNKNOWN_CARRIER_TYPE: 'carrierType',
  UNKNOWN_BASE_CITY: 'baseCitySlug',
};

const CITY_FIELDS = ['name', 'nameFrom', 'nameTo', 'country', 'worldPart', 'description'];
const AIRPORT_FIELDS = ['iata', 'airportName', 'lat', 'lon', 'timezone'];
const AIRLINE_FIELDS = [
  'code',
  'name',
  'color',
  'description',
  'baggageIncluded',
  'country',
  'carrierType',
  'baseCitySlug',
];

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

/**
 * Новое значение выпадающего списка из окна кнопки «Добавить». Сохраняется сразу, поэтому
 * появляется в списках всех форм; страницы админки получают списки заново.
 */
export async function addReferenceValueAction(
  kind: unknown,
  value: unknown,
): Promise<{ value: string } | { error: string }> {
  await requireAdmin();
  const parsed = newReferenceValueSchema.safeParse({ kind, value });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте значение.' };
  const saved = await service.addReferenceValue(parsed.data);
  revalidatePath('/admin', 'layout');
  return { value: saved };
}

/** Город: со `slug` в форме — правка, без — новый город с аэропортом. */
export async function saveCityAction(
  _: ReferenceFormState,
  formData: FormData,
): Promise<ReferenceFormState> {
  // Права — в каждом action: страница админки уже проверила, но запрос можно отправить и в обход неё.
  await requireAdmin();
  const slug = String(formData.get('slug') ?? '');
  const back = returnPath(formData.get('back'));
  const values = readForm(formData, slug ? CITY_FIELDS : [...CITY_FIELDS, ...AIRPORT_FIELDS]);

  if (slug) {
    const parsed = cityInputSchema.safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
    const result = await service.updateCity(slug, parsed.data);
    if (!result.ok) return failure(result.error, values);
    redirect(withParams(back ?? '/admin/cities', { saved: result.data.slug }));
  }

  const parsed = newCitySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const result = await service.createCity(parsed.data);
  if (!result.ok) return failure(result.error, values);
  // Открыли в окне кнопки «Добавить» в форме авиакомпании: без перехода, та форма не теряет ввод.
  if (formData.get('inline')) {
    revalidatePath('/admin', 'layout');
    return { saved: { value: result.data.slug, label: parsed.data.name } };
  }
  // Открыли кнопкой «Добавить» из формы рейсов — обратно туда, с аэропортом нового города.
  const target = referenceReturnSchema.parse(formData.get('returnTo'));
  if (target === 'flights-origin' || target === 'flights-destination') {
    redirect(referenceReturnHref(target, parsed.data.iata, back));
  }
  redirect(withParams(back ?? '/admin/cities', { saved: result.data.slug }));
}

export async function deleteCityAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await service.deleteCity(String(formData.get('slug') ?? ''));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect(withParams(returnPath(formData.get('back')) ?? '/admin/cities', { deleted: 1 }));
}

/** Авиакомпания: с `currentCode` в форме — правка, без — новая. */
export async function saveAirlineAction(
  _: ReferenceFormState,
  formData: FormData,
): Promise<ReferenceFormState> {
  await requireAdmin();
  const currentCode = String(formData.get('currentCode') ?? '');
  const back = returnPath(formData.get('back'));
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
  // Новую авиакомпанию открыли кнопкой «Добавить» из формы рейсов — обратно туда, с ней в списке.
  const target = currentCode ? undefined : referenceReturnSchema.parse(formData.get('returnTo'));
  if (target === 'flights-airline') redirect(referenceReturnHref(target, result.data.code, back));
  redirect(withParams(back ?? '/admin/airlines', { saved: result.data.code }));
}

export async function deleteAirlineAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const result = await service.deleteAirline(String(formData.get('code') ?? ''));
  if (!result.ok) return { error: MESSAGES[result.error] };
  redirect(withParams(returnPath(formData.get('back')) ?? '/admin/airlines', { deleted: 1 }));
}

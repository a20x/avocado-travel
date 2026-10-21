'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/modules/auth/server';
import { cardSchema, createOrderSchema, type BookingError, type OrderError } from '../model';
import * as service from './service';

/**
 * Состояние формы после отправки: общая ошибка, ошибки полей и введённое по имени поля —
 * React очищает форму после отправки, а набирать имена заново никто не хочет.
 */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const BOOKING_MESSAGES: Record<BookingError, string> = {
  INVALID_REQUEST: 'Не получилось разобрать выбор мест. Вернитесь к схеме салона.',
  FLIGHT_NOT_FOUND: 'Рейс не найден.',
  FLIGHT_DEPARTED: 'Этот рейс уже улетел.',
  SEAT_UNAVAILABLE:
    'Пока вы заполняли данные, одно из мест заняли. Вернитесь к схеме салона и выберите другое.',
};

const ORDER_MESSAGES: Record<OrderError, string> = {
  ORDER_NOT_FOUND: 'Заказ не найден.',
  ORDER_EXPIRED: 'Время на оплату истекло, бронь отменена. Выберите места заново.',
  ORDER_NOT_PENDING: 'Этот заказ уже оплачен или отменён.',
  ORDER_NOT_CANCELLABLE: 'Эту бронь уже нельзя отменить: она отменена или рейс улетел.',
};

const list = (formData: FormData, key: string) => formData.getAll(key).map(String);

/** Ошибки полей: путь «passengers.1.lastName» → ключ «passengers.1.lastName», первая ошибка поля. */
function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}

/** «Перейти к оплате»: создаёт заказ и ведёт на страницу оплаты. */
export async function createOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const flight = String(formData.get('flight') ?? '');
  const seats = list(formData, 'seats');
  const query = new URLSearchParams({ flight, cabinClass: String(formData.get('cabinClass')) });
  seats.forEach((seat) => query.append('seats', seat));
  // Права проверяются в каждом action, а не только на странице.
  const user = await requireUser(`/booking?${query}`);

  // Поля пассажиров пронумерованы по порядку мест: passenger-0-firstName, passenger-0-lastName…
  const values = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith('passenger-'))
      .map(([key, value]) => [key, String(value)]),
  );
  const parsed = createOrderSchema.safeParse({
    flight,
    cabinClass: formData.get('cabinClass'),
    seats,
    passengers: seats.map((_, i) => ({
      firstName: String(formData.get(`passenger-${i}-firstName`) ?? ''),
      lastName: String(formData.get(`passenger-${i}-lastName`) ?? ''),
    })),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };

  const result = await service.createOrder(user.id, parsed.data);
  if (!result.ok) return { error: BOOKING_MESSAGES[result.error], values };

  redirect(`/booking/${result.data.orderId}`);
}

/** «Оплатить»: проверяет формат карты и отмечает заказ оплаченным. Данные карты не сохраняются. */
export async function payOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const orderId = String(formData.get('order') ?? '');
  const user = await requireUser(`/booking/${orderId}`);

  const now = new Date();
  const card = cardSchema(now).safeParse({
    number: String(formData.get('number') ?? ''),
    expiry: String(formData.get('expiry') ?? ''),
    cvc: String(formData.get('cvc') ?? ''),
  });
  if (!card.success) return { fieldErrors: fieldErrors(card.error.issues) };

  const result = await service.payOrder(user.id, orderId, now);
  if (!result.ok) return { error: ORDER_MESSAGES[result.error] };

  redirect(`/booking/${orderId}?paid=1`);
}

/** «Отменить бронь» в личном кабинете — после подтверждения в диалоге. */
export async function cancelOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser('/account');
  const result = await service.cancelOrder(user.id, String(formData.get('order') ?? ''));
  if (!result.ok) return { error: ORDER_MESSAGES[result.error] };
  redirect('/account?cancelled=1');
}

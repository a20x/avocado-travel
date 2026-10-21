/**
 * Серверный вход модуля booking: сервисы бронирования (ADR-0008).
 */
import 'server-only';

export { createOrder, getOrder, payOrder, prepareBooking } from './server/service';
export type { BookingDraft } from './server/service';

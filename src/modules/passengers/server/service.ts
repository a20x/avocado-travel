import 'server-only';
import { syncPageDocuments } from '@/modules/search/server';
import { PASSENGER_PAGES } from '../content';
import { PASSENGERS_REF_PREFIX, passengerSearchDocuments } from '../model';

/**
 * Обновить страницы раздела в поиске по сайту. Вызывается при запуске сервера на хостинге
 * (src/instrumentation.ts): так новые и изменённые страницы попадают в поиск после обычной
 * выкладки, без сида, который стирает данные посетителей. Остальные документы не трогаются.
 */
export function indexPassengerPages(): Promise<void> {
  return syncPageDocuments(PASSENGERS_REF_PREFIX, passengerSearchDocuments(PASSENGER_PAGES));
}

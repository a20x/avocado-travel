import { handleExpireOrdersCron } from '@/modules/booking/server';

// Автоотмена неоплаченных заказов. GET — для планировщиков, которые не умеют POST.
export const POST = handleExpireOrdersCron;
export const GET = handleExpireOrdersCron;

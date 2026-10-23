import { apiRoute } from '@/modules/exchange/server';

// Выгрузка расписания на дату (docs/05-api.md, «Выгрузки»).
export const GET = apiRoute('exportFlights');

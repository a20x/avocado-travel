import { apiRoute } from '@/modules/exchange/server';

// Выгрузка новостей (docs/05-api.md, «Выгрузки»).
export const GET = apiRoute('exportNews');

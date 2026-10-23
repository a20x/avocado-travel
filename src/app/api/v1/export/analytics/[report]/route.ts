import { apiRoute } from '@/modules/exchange/server';

// Выгрузка отчёта аналитики (docs/05-api.md, «Выгрузки»).
export const GET = apiRoute('exportAnalytics');

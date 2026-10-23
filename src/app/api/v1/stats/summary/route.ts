import { apiRoute } from '@/modules/exchange/server';

// Сводная статистика посещений (docs/05-api.md).
export const GET = apiRoute('getStatsSummary');

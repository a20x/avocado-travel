import { handleMergedRss } from '@/modules/exchange/server';

// Объединённые новости сайта и введённой RSS-ленты в формате RSS — значок RSS на вкладке (лаба 4).
export const GET = handleMergedRss;

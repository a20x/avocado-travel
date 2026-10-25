import { handleImportFeedsCron } from '@/modules/exchange/server';

// Импорт новостей отрасли из внешних лент. GET — для планировщиков, которые не умеют POST.
export const POST = handleImportFeedsCron;
export const GET = handleImportFeedsCron;

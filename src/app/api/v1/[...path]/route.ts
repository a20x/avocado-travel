import { handleUnknownEndpoint } from '@/modules/exchange/server';

// Неизвестный адрес API — ошибка в формате API (JSON), а не HTML-страница.
export const GET = handleUnknownEndpoint;

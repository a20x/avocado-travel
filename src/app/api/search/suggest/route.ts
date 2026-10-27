import { handleSuggestRequest } from '@/modules/search/server';

// Подсказки для строки поиска в шапке, пока посетитель печатает.
export const GET = handleSuggestRequest;

import { handleCitySuggestRequest } from '@/modules/weather/server';

// Подсказки городов в поле «Город» на странице «Погода», пока посетитель печатает.
export const GET = handleCitySuggestRequest;

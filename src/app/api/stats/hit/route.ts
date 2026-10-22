import { handleHitRequest } from '@/modules/stats/server';

// Счётчик посещений: браузер присылает адрес открытой страницы.
export const POST = handleHitRequest;

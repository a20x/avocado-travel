import { handleFeed } from '@/modules/exchange/server';

// Лента новостей в формате JSON Feed 1.1 (L4-02, docs/05-api.md).
export const GET = handleFeed;

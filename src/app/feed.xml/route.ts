import { handleRssFeed } from '@/modules/exchange/server';

// Лента новостей сайта в RSS 2.0 (L4-02, лаба 4) — рядом с JSON Feed /feed.json.
export const GET = handleRssFeed;

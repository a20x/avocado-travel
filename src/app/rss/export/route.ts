import { handleCombinedExport } from '@/modules/exchange/server';

// Выгрузка общей ленты вкладки «RSS» в CSV, XML, RSS, TXT (ASCII) и ASCII в XML-тегах (лаба 4).
export const GET = handleCombinedExport;

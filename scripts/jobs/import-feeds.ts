/**
 * Импорт новостей отрасли вручную, без расписания: `pnpm job:import-feeds`.
 * Делает то же, что маршрут /api/cron/import-feeds, но напрямую — сервер запускать не нужно.
 */
import { importIndustryNews } from '@/modules/exchange/server';
import { db } from '@/server/db';

importIndustryNews()
  .then(({ feeds, removed }) => {
    for (const feed of feeds) {
      const { invalid, old, airline, duplicate } = feed.skipped;
      console.log(
        feed.error
          ? `${feed.feed}: ошибка — ${feed.error}`
          : `${feed.feed}: получено ${feed.received}, добавлено ${feed.added}; пропущено: с авиакомпаниями ${airline}, старых ${old}, дублей ${duplicate}, неполных ${invalid}`,
      );
    }
    console.log(`Удалено устаревших новостей отрасли: ${removed}`);
  })
  .catch((error: unknown) => {
    console.error('Не удалось импортировать ленты:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());

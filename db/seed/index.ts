/**
 * Наполнение базы демо-данными: `pnpm db:seed`.
 *
 * Скрипты в db/seed — инструмент разработчика, а не код сайта, поэтому пишут в базу через
 * Drizzle напрямую (так принято в проектах на Drizzle). Таблицы берутся из index.ts модулей.
 * Каждый запуск даёт одинаковый результат: таблицы очищаются и заполняются заново.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { seedCatalogData } from './catalog-data';

async function main() {
  const started = Date.now();

  // Всё или ничего: если что-то упадёт, база останется как была.
  const counts = await db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE airports, airlines, aircraft_models RESTART IDENTITY CASCADE`,
    );
    return { ...(await seedCatalogData(tx)) };
  });

  console.log('Демо-данные загружены:', counts, `за ${Date.now() - started} мс`);
}

main()
  .catch((error: unknown) => {
    console.error('Не удалось загрузить демо-данные:', error);
    process.exitCode = 1;
  })
  // Закрываем пул соединений, иначе процесс не завершится.
  .finally(() => db.$client.end());

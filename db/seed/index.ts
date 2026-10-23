/**
 * Наполнение базы демо-данными: `pnpm db:seed`.
 *
 * Скрипты в db/seed — инструмент разработчика, а не код сайта, поэтому пишут в базу через
 * Drizzle напрямую (так принято в проектах на Drizzle). Таблицы берутся из index.ts модулей.
 * Каждый запуск даёт одинаковый результат: справочники, рейсы, заказы, новости, гостевая книга, форум, статистика посещений, рейтинг и опрос очищаются и заполняются заново.
 * Пользователи не удаляются: зарегистрированные аккаунты сохраняются, админ и демо-авторы форума создаются или обновляются.
 * Даты рейсов отсчитываются от сегодняшнего дня по Москве.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { dateInZone } from '@/shared/lib/time';
import { seedAdmin } from './admin';
import { seedCatalogData } from './catalog-data';
import { seedFlights } from './flights';
import { seedForum } from './forum';
import { seedGuestbook } from './guestbook';
import { seedNews } from './news';
import { seedPoll } from './poll';
import { seedRatings } from './rating';
import { seedStats } from './stats';

async function main() {
  const started = Date.now();
  const today = dateInZone(new Date(), 'Europe/Moscow');

  // Всё или ничего: если что-то упадёт, база останется как была.
  const counts = await db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE site_ratings, polls, poll_options, poll_votes, page_views, forum_topics, forum_posts, guestbook_entries, guestbook_stop_words, guestbook_banned_hosts, news, orders, flights, airports, airlines, aircraft_models RESTART IDENTITY CASCADE`,
    );
    const catalog = await seedCatalogData(tx);
    const flightCount = await seedFlights(tx, catalog, today);
    // Админ — до форума: он автор темы с правилами.
    const admin = await seedAdmin(tx);
    return {
      admin,
      airports: catalog.airports.length,
      airlines: catalog.airlines.length,
      aircraftModels: catalog.aircraftModels.length,
      flights: flightCount,
      news: await seedNews(tx, today),
      guestbook: await seedGuestbook(tx, today),
      forum: await seedForum(tx, today),
      pageViews: await seedStats(tx, today),
      ratings: await seedRatings(tx, today),
      pollVotes: await seedPoll(tx),
    };
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

/**
 * Наполнение базы демо-данными: `pnpm db:seed`.
 *
 * Скрипты в db/seed — инструмент разработчика, а не код сайта, поэтому пишут в базу через
 * Drizzle напрямую (так принято в проектах на Drizzle). Таблицы берутся из index.ts модулей.
 * Каждый запуск даёт одинаковый результат: справочники, рейсы, демо-продажи за полгода, новости, гостевая книга, форум, статистика посещений, рейтинг, опрос, каталог ресурсов, реклама и поисковый индекс очищаются и заполняются заново.
 * Пользователи и импортированные новости отрасли не удаляются: зарегистрированные аккаунты сохраняются, админ, демо-авторы форума и демо-покупатели создаются или обновляются.
 * Даты рейсов отсчитываются от сегодняшнего дня по Москве.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';
import { dateInZone } from '@/shared/lib/time';
import { seedAdmin } from './admin';
import { seedAds } from './ads';
import { seedCatalog } from './catalog';
import { seedCatalogData } from './catalog-data';
import { seedFlights } from './flights';
import { seedForum } from './forum';
import { seedGuestbook } from './guestbook';
import { seedNews } from './news';
import { seedOrders } from './orders';
import { seedPoll } from './poll';
import { seedRatings } from './rating';
import { seedSearch } from './search';
import { seedStats } from './stats';

async function main() {
  const started = Date.now();
  const today = dateInZone(new Date(), 'Europe/Moscow');

  // Всё или ничего: если что-то упадёт, база останется как была.
  const counts = await db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE TABLE search_documents, ad_campaigns, ad_events, catalog_sections, catalog_links, site_ratings, polls, poll_options, poll_votes, page_views, forum_topics, forum_posts, guestbook_entries, guestbook_stop_words, guestbook_banned_hosts, orders, flights, airports, cities, airlines, aircraft_models RESTART IDENTITY CASCADE`,
    );
    // Новости отрасли — не демо-данные, а импорт из внешних лент: их сид не трогает.
    await tx.execute(sql`DELETE FROM news WHERE source = 'site'`);
    const catalog = await seedCatalogData(tx);
    const flightCount = await seedFlights(tx, catalog, today);
    // Админ — до форума: он автор темы с правилами.
    const admin = await seedAdmin(tx);
    return {
      admin,
      cities: catalog.cities.length,
      airports: catalog.airports.length,
      airlines: catalog.airlines.length,
      aircraftModels: catalog.aircraftModels.length,
      flights: flightCount,
      sales: await seedOrders(tx, today),
      news: await seedNews(tx, today),
      guestbook: await seedGuestbook(tx, today),
      forum: await seedForum(tx, today),
      pageViews: await seedStats(tx, today),
      ratings: await seedRatings(tx, today),
      pollVotes: await seedPoll(tx),
      catalogLinks: await seedCatalog(tx),
      ads: await seedAds(tx, today),
      // Индекс — последним: в него попадают уже загруженные новости и форум.
      searchDocuments: await seedSearch(tx),
    };
  });

  // Статистика для планировщика запросов. В новой базе её нет, пока до таблиц не дойдёт
  // автоочистка, и отчёты аналитики по десяткам тысяч билетов строились бы почти минуту.
  await db.execute(sql`ANALYZE`);

  console.log('Демо-данные загружены:', counts, `за ${Date.now() - started} мс`);
}

main()
  .catch((error: unknown) => {
    console.error('Не удалось загрузить демо-данные:', error);
    process.exitCode = 1;
  })
  // Закрываем пул соединений, иначе процесс не завершится.
  .finally(() => db.$client.end());

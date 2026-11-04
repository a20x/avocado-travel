/**
 * Выполняется один раз при запуске сервера, до первого запроса.
 * В Docker-образе (DB_MIGRATE_ON_START=true) здесь применяются миграции базы: после деплоя
 * со схемой новой версии сайт не начнёт отвечать, пока база не обновлена (docs/09-deploy.md),
 * а затем в поиске по сайту обновляются статические страницы раздела «Пассажирам».
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { env } = await import('./server/env');
  if (!env.DB_MIGRATE_ON_START) return;
  const { migrateDatabase } = await import('./server/migrate');
  await migrateDatabase();
  console.log('Миграции базы применены');

  // Страницы «Пассажирам» — в поиск по сайту: сид на боевой базе запускать нельзя (он стирает
  // данные посетителей), а новые страницы должны находиться сразу после выкладки.
  // Ошибка здесь не мешает запуску: сайт работает, просто поиск по разделу не обновится.
  try {
    const { indexPassengerPages } = await import('./modules/passengers/server');
    await indexPassengerPages();
    console.log('Страницы «Пассажирам» обновлены в поиске');
  } catch (error) {
    console.error('Не удалось обновить страницы «Пассажирам» в поиске', error);
  }
}

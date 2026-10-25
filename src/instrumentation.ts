/**
 * Выполняется один раз при запуске сервера, до первого запроса.
 * В Docker-образе (DB_MIGRATE_ON_START=true) здесь применяются миграции базы: после деплоя
 * со схемой новой версии сайт не начнёт отвечать, пока база не обновлена (docs/09-deploy.md).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { env } = await import('./server/env');
  if (!env.DB_MIGRATE_ON_START) return;
  const { migrateDatabase } = await import('./server/migrate');
  await migrateDatabase();
  console.log('Миграции базы применены');
}

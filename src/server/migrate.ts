import 'server-only';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';

/**
 * Применить новые миграции из db/migrations — то же, что `pnpm db:migrate`, но без drizzle-kit:
 * в Docker-образе его нет. Уже применённые миграции пропускаются (таблица drizzle.__drizzle_migrations).
 */
export async function migrateDatabase(): Promise<void> {
  await migrate(db, { migrationsFolder: 'db/migrations' });
}

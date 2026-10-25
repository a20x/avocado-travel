import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from './env';

// В режиме разработки Next.js перезагружает модули при каждом сохранении файла.
// Без кэша в globalThis каждая перезагрузка открывала бы новый пул соединений с базой.
const globalForDb = globalThis as unknown as { dbPool?: Pool };

const pool = globalForDb.dbPool ?? new Pool({ connectionString: env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = pool;
}

// Облачная база (Neon) засыпает без запросов и рвёт простаивающие соединения. Без обработчика
// такой обрыв — необработанное событие 'error', и Node.js завершает весь сервер.
// Пул сам откроет новое соединение при следующем запросе.
pool.on('error', (error) => {
  console.warn('Соединение с базой закрыто сервером:', error.message);
});

/**
 * Подключение к базе. Схемы модулей сюда не передаются (ADR-0007):
 * репозитории импортируют нужные таблицы сами.
 */
export const db = drizzle({ client: pool, casing: 'snake_case' });

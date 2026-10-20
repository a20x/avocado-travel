import type { db } from '@/server/db';

/** Подключение к базе внутри транзакции наполнения или само подключение. */
export type Db = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

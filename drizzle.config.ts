import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit запускается вне Next.js и не читает .env сам. В CI файла нет — переменные приходят из окружения.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL не задана. Скопируйте .env.example в .env');
}

export default defineConfig({
  dialect: 'postgresql',
  // Каждый модуль описывает свои таблицы сам; общего сборщика нет (ADR-0007).
  schema: './src/modules/*/schema.ts',
  out: './db/migrations',
  casing: 'snake_case',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});

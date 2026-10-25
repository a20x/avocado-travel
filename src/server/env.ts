import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Адрес сайта — для ссылок и настроек авторизации. */
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
  /** Ключ подписи сессий Better Auth. Сгенерировать: openssl rand -base64 32. */
  BETTER_AUTH_SECRET: z.string().min(32, 'Нужно не меньше 32 символов'),
  /** Администратор сайта: создаётся скриптом демо-данных (pnpm db:seed). */
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8, 'Нужно не меньше 8 символов'),
  /** Пароль заданий по расписанию: планировщик хостинга присылает его в заголовке Authorization. */
  CRON_SECRET: z.string().min(16, 'Нужно не меньше 16 символов'),
  /** Соль хэша IP в статистике посещений: без неё хэш можно подобрать перебором адресов. */
  IP_HASH_SALT: z.string().min(16, 'Нужно не меньше 16 символов'),
  /** Номер счётчика Яндекс.Метрики. Не задан — код Метрики на сайт не ставится. */
  NEXT_PUBLIC_YANDEX_METRIKA_ID: z
    .string()
    .regex(/^\d+$/, 'Только цифры — номер счётчика из кабинета Метрики')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /**
   * Отключить ограничение частоты запросов. Только для сквозных тестов: они регистрируют
   * десятки покупателей с одного адреса. Сам ограничитель проверяют модульные тесты.
   */
  RATE_LIMIT_DISABLED: z.stringbool().default(false),
  /**
   * Заголовок с IP посетителя, который выставляет прокси хостинга и который нельзя подделать
   * (на Render — true-client-ip от Cloudflare). Не задан — последний адрес X-Forwarded-For.
   */
  CLIENT_IP_HEADER: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Имя заголовка строчными буквами, например true-client-ip')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /** Применять миграции базы при запуске сервера. Включено в Docker-образе (docs/09-deploy.md). */
  DB_MIGRATE_ON_START: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(process.env);

// Сборка (`next build`) загружает модули маршрутов, но страниц с данными не рисует и в базу
// не ходит, поэтому секреты ей не нужны — в Docker-сборке их и нет (docs/09-deploy.md).
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Падаем сразу при старте с понятным списком проблем, а не позже с загадочной ошибкой подключения.
// Сервер проверяет переменные при запуске: их загружает src/instrumentation.ts.
if (!parsed.success && !isBuild) {
  throw new Error(`Неверные переменные окружения:\n${z.prettifyError(parsed.error)}`);
}

/** Проверенные переменные окружения сервера. */
export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof envSchema>);

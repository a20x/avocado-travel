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
  /**
   * Отключить ограничение частоты запросов. Только для сквозных тестов: они регистрируют
   * десятки покупателей с одного адреса. Сам ограничитель проверяют модульные тесты.
   */
  RATE_LIMIT_DISABLED: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(process.env);

// Падаем сразу при старте с понятным списком проблем, а не позже с загадочной ошибкой подключения.
if (!parsed.success) {
  throw new Error(`Неверные переменные окружения:\n${z.prettifyError(parsed.error)}`);
}

/** Проверенные переменные окружения сервера. */
export const env = parsed.data;

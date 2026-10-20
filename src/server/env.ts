import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

const parsed = envSchema.safeParse(process.env);

// Падаем сразу при старте с понятным списком проблем, а не позже с загадочной ошибкой подключения.
if (!parsed.success) {
  throw new Error(`Неверные переменные окружения:\n${z.prettifyError(parsed.error)}`);
}

/** Проверенные переменные окружения сервера. */
export const env = parsed.data;

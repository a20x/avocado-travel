import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { accounts, users } from '@/modules/auth';
import { env } from '@/server/env';
import type { Db } from './db';

/**
 * Администратор из ADMIN_EMAIL и ADMIN_PASSWORD (docs/03-architecture.md, «Авторизация»).
 * Пароль хэшируется той же функцией, что у Better Auth, — вход работает обычной формой.
 * Повторный запуск не создаёт второго админа, а обновляет пароль и роль существующего.
 */
export async function seedAdmin(db: Db): Promise<string> {
  const password = await hashPassword(env.ADMIN_PASSWORD);
  const email = env.ADMIN_EMAIL.toLowerCase();

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    await db
      .update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    await db
      .update(accounts)
      .set({ password, updatedAt: new Date() })
      .where(and(eq(accounts.userId, existing.id), eq(accounts.providerId, 'credential')));
    return email;
  }

  const id = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id, name: 'Администратор', email, role: 'admin', emailVerified: true });
  // Вход по почте и паролю в Better Auth — запись `credential`, accountId совпадает с id пользователя.
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: 'credential',
    userId: id,
    password,
  });
  return email;
}

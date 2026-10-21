import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeReturnPath } from '@/modules/auth';
import { getCurrentUser } from '@/modules/auth/server';
import { AuthForm } from '@/modules/auth/ui';
import { AuthCard } from '../AuthCard';

export const metadata: Metadata = { title: 'Регистрация', robots: { index: false } };

export default async function RegisterPage(props: PageProps<'/register'>) {
  const { next } = await props.searchParams;
  const returnTo = safeReturnPath(next);
  if (await getCurrentUser()) redirect(returnTo);

  return (
    <AuthCard title="Регистрация">
      {/* docs/02-product.md, «Персональные данные». */}
      <p className="rounded-sm bg-warning-bg px-4 py-3 text-sm text-warning">
        Это учебный проект: не используйте пароль от своих настоящих аккаунтов.
      </p>
      <AuthForm mode="sign-up" next={returnTo} />
      <p className="text-slate">
        Уже есть аккаунт? <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>Войдите</Link>
      </p>
    </AuthCard>
  );
}

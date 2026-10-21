import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeReturnPath } from '@/modules/auth';
import { getCurrentUser } from '@/modules/auth/server';
import { AuthForm } from '@/modules/auth/ui';
import { AuthCard } from '../AuthCard';

export const metadata: Metadata = { title: 'Вход', robots: { index: false } };

export default async function LoginPage(props: PageProps<'/login'>) {
  const { next } = await props.searchParams;
  const returnTo = safeReturnPath(next);
  // Уже вошедшему форма не нужна.
  if (await getCurrentUser()) redirect(returnTo);

  return (
    <AuthCard title="Вход">
      <AuthForm mode="sign-in" next={returnTo} />
      <p className="text-slate">
        Нет аккаунта?{' '}
        <Link href={`/register?next=${encodeURIComponent(returnTo)}`}>Зарегистрируйтесь</Link>
      </p>
    </AuthCard>
  );
}

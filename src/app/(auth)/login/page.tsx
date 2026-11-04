import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { afterSignIn, explicitReturnPath } from '@/modules/auth';
import { getCurrentUser } from '@/modules/auth/server';
import { AuthForm } from '@/modules/auth/ui';
import { pageMetadata } from '@/shared/lib/metadata';
import { AuthCard } from '../AuthCard';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Вход',
    description: 'Вход в Avocado Travel: бронирование билетов, заказы и форум.',
    path: '/login',
  }),
  robots: { index: false },
};

export default async function LoginPage(props: PageProps<'/login'>) {
  const { next } = await props.searchParams;
  // Без адреса возврата после входа решает роль: администратор — в админку, покупатель — в кабинет.
  const returnTo = explicitReturnPath(next);
  // Уже вошедшему форма не нужна.
  const user = await getCurrentUser();
  if (user) redirect(afterSignIn(returnTo, user.role));
  const query = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';

  return (
    <AuthCard title="Вход">
      <AuthForm mode="sign-in" next={returnTo ?? undefined} />
      <p className="text-slate">
        Нет аккаунта? <Link href={`/register${query}`}>Зарегистрируйтесь</Link>
      </p>
    </AuthCard>
  );
}

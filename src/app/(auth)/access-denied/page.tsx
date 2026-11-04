import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { explicitReturnPath } from '@/modules/auth';
import { getCurrentUser } from '@/modules/auth/server';
import { SwitchAccountButton } from '@/modules/auth/ui';
import { AuthCard } from '../AuthCard';

export const metadata: Metadata = { title: 'Только для администратора', robots: { index: false } };

/**
 * Сюда ведёт закрытая страница админки, если вошёл обычный пользователь (requireAdmin):
 * объяснение и кнопка «Выйти и войти как администратор» с возвратом на ту страницу.
 */
export default async function AccessDeniedPage(props: PageProps<'/access-denied'>) {
  const { next } = await props.searchParams;
  const returnTo = explicitReturnPath(next) ?? '/admin';
  const user = await getCurrentUser();
  // Гостю — сразу вход, администратору — туда, куда он шёл.
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (user.role === 'admin') redirect(returnTo);

  return (
    <AuthCard title="Только для администратора">
      <p>
        Этот раздел — админка сайта: ввод городов, авиакомпаний, рейсов и новостей. Открыть его
        может только администратор.
      </p>
      <p className="rounded-sm bg-warning-bg px-4 py-3 text-warning">
        Сейчас вы вошли как <b>{user.name}</b> ({user.email}) — это обычный аккаунт, без прав
        администратора.
      </p>
      <p>Выйдите и войдите под учётной записью администратора — откроется нужная страница.</p>
      <SwitchAccountButton next={returnTo} />
      <p className="text-slate">
        Или вернитесь <Link href="/">на главную</Link>.
      </p>
    </AuthCard>
  );
}

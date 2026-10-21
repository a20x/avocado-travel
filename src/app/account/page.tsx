import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/modules/auth/server';
import { SignOutButton } from '@/modules/auth/ui';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export const metadata: Metadata = { title: 'Личный кабинет', robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser('/account');

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Личный кабинет</h1>
          <p className="text-slate">
            {user.name} · {user.email}
          </p>
        </div>
        <SignOutButton />
      </header>

      {/* Список заказов — задача T-14. */}
      <Card as="section" aria-labelledby="orders-title">
        <h2 id="orders-title" className="sr-only">
          Мои заказы
        </h2>
        <EmptyState
          image="/images/illustrations/empty-orders.svg"
          title="Заказов пока нет"
          text="Найдите рейс, выберите места — и заказ появится здесь."
          action={
            <Link href="/" className={buttonClasses()}>
              Найти рейс
            </Link>
          }
        />
      </Card>
    </div>
  );
}

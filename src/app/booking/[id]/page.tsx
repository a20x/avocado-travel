import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/modules/auth/server';
import { getOrder } from '@/modules/booking/server';
import { OrderTickets, PaymentForm } from '@/modules/booking/ui';
import { plural } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Бронь', robots: { index: false } };

export default async function OrderPage(props: PageProps<'/booking/[id]'>) {
  const [{ id }, params] = await Promise.all([props.params, props.searchParams]);
  const user = await requireUser(`/booking/${id}`);
  const result = await getOrder(user.id, id);
  if (!result.ok) notFound();

  const order = result.data;
  const now = new Date();

  if (order.status === 'cancelled') {
    return (
      <div className="container-site py-8">
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            titleAs="h1"
            title="Бронь отменена"
            text="Время на оплату истекло или заказ отменён, места освобождены. Их можно выбрать заново."
            action={
              <Link
                href={`/flights/${order.flight.id}?passengers=${order.tickets.length}&cabinClass=${order.cabinClass}`}
                className={buttonClasses({ variant: 'secondary' })}
              >
                Выбрать места заново
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  if (order.status === 'paid') {
    return (
      <div className="container-site grid gap-6 py-8">
        <Card as="section" className="grid justify-items-center gap-3 p-6 text-center md:p-10">
          {/* Иллюстрация декоративная: смысл передаёт заголовок. */}
          <Image src="/images/illustrations/booking-success.svg" alt="" width={260} height={189} />
          <h1 className="text-3xl">Бронь оформлена</h1>
          <p className="text-slate">Код брони — назовите его на регистрации в аэропорту:</p>
          <p className="rounded-md bg-mist px-6 py-3 font-mono text-4xl font-semibold tracking-[0.2em]">
            {order.pnr}
          </p>
          <Link href="/account" className={buttonClasses({ variant: 'secondary' })}>
            Мои заказы
          </Link>
        </Card>
        <OrderTickets order={order} />
        {params.paid === '1' ? (
          <Toast message="Оплата прошла. Билеты — в личном кабинете." />
        ) : null}
      </div>
    );
  }

  const minutesLeft = Math.max(1, Math.ceil((order.expiresAt.getTime() - now.getTime()) / 60_000));
  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid gap-1">
        <h1 className="text-3xl">Оплата брони</h1>
        <p className="text-slate">
          Места держатся за вами ещё {minutesLeft}{' '}
          {plural(minutesLeft, ['минуту', 'минуты', 'минут'])}. Не успеете — бронь отменится сама.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PaymentForm orderId={order.id} total={order.total} />
        <OrderTickets order={order} />
      </div>
    </div>
  );
}

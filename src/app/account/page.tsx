import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/modules/auth/server';
import { SignOutButton } from '@/modules/auth/ui';
import { canCancel, type OrderDetails, type OrderStatus } from '@/modules/booking';
import { listOrders } from '@/modules/booking/server';
import { CancelOrderButton, OrderTickets } from '@/modules/booking/ui';
import { formatDate, plural } from '@/shared/lib/format';
import { dateInZone } from '@/shared/lib/time';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Личный кабинет', robots: { index: false } };

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Ждёт оплаты', tone: 'warning' },
  paid: { label: 'Оплачен', tone: 'success' },
  cancelled: { label: 'Отменён', tone: 'muted' },
};

function OrderHeader({ order }: { order: OrderDetails }) {
  const status = STATUS[order.status];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Badge tone={status.tone}>{status.label}</Badge>
      <span>
        Код брони <b className="font-mono tracking-wider">{order.pnr}</b>
      </span>
      <span className="text-sm text-slate">
        оформлен {formatDate(dateInZone(order.createdAt, 'Europe/Moscow'))}
      </span>
    </div>
  );
}

function OrderActions({ order, now }: { order: OrderDetails; now: Date }) {
  if (!canCancel(order, now)) return null;
  const minutesLeft = Math.max(1, Math.ceil((order.expiresAt.getTime() - now.getTime()) / 60_000));
  return (
    <div className="flex flex-wrap items-center gap-3">
      {order.status === 'pending' ? (
        <>
          <Link href={`/booking/${order.id}`} className={buttonClasses()}>
            Оплатить
          </Link>
          <span className="text-sm text-slate">
            ещё {minutesLeft} {plural(minutesLeft, ['минута', 'минуты', 'минут'])}
          </span>
        </>
      ) : null}
      <div className="ml-auto">
        <CancelOrderButton orderId={order.id} pnr={order.pnr} isPaid={order.status === 'paid'} />
      </div>
    </div>
  );
}

export default async function AccountPage(props: PageProps<'/account'>) {
  const user = await requireUser('/account');
  const [orders, params] = await Promise.all([listOrders(user.id), props.searchParams]);
  const now = new Date();

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

      <section aria-labelledby="orders-title" className="grid gap-4">
        <h2 id="orders-title" className="text-2xl">
          Мои заказы
        </h2>
        {orders.length === 0 ? (
          <Card>
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
        ) : (
          orders.map((order) => (
            <OrderTickets
              key={order.id}
              order={order}
              headingLevel="h3"
              header={<OrderHeader order={order} />}
              footer={<OrderActions order={order} now={now} />}
            />
          ))
        )}
      </section>

      {params.cancelled === '1' ? <Toast message="Бронь отменена, места освобождены." /> : null}
    </div>
  );
}

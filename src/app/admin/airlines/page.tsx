import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listAirlinesForAdmin } from '@/modules/catalog-data/server';
import { AirlineTable } from '@/modules/catalog-data/ui';
import { buttonClasses } from '@/shared/ui/Button';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Авиакомпании — админка', robots: { index: false } };

export default async function AdminAirlinesPage(props: PageProps<'/admin/airlines'>) {
  await requireAdmin('/admin/airlines');
  const params = await props.searchParams;
  const airlines = await listAirlinesForAdmin();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Авиакомпании</h1>
        <Link href="/admin/airlines/new" className={buttonClasses()}>
          Добавить авиакомпанию
        </Link>
      </header>
      <p className="max-w-3xl text-slate">
        Новая авиакомпания сразу появляется во всех выпадающих списках сайта. Чтобы поиск находил её
        рейсы, заведите их в разделе <Link href="/admin/flights">«Рейсы»</Link>. Авиакомпанию с
        рейсами удалить нельзя — сначала удалите рейсы.
      </p>
      <AirlineTable airlines={airlines} />
      {params.saved ? <Toast message="Авиакомпания сохранена." /> : null}
      {params.deleted ? <Toast message="Авиакомпания удалена." /> : null}
    </div>
  );
}

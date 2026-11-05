import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listCitiesForAdmin } from '@/modules/catalog-data/server';
import { CityTable } from '@/modules/catalog-data/ui';
import { buttonClasses } from '@/shared/ui/Button';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Города — админка', robots: { index: false } };

export default async function AdminCitiesPage(props: PageProps<'/admin/cities'>) {
  await requireAdmin('/admin/cities');
  const params = await props.searchParams;
  const cities = await listCitiesForAdmin();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Города</h1>
        <Link href="/admin/cities/new" className={buttonClasses()}>
          Добавить город
        </Link>
      </header>
      <p className="max-w-3xl text-slate">
        Новый город сразу появляется в списках форм и в поиске{' '}
        <Link href="/database?report=countryCity">«Страна и город»</Link> на вкладке «БД». В поиске
        рейсов он появится с первым рейсом: заведите его в разделе{' '}
        <Link href="/admin/flights">«Рейсы»</Link>. Город с рейсами и город, который базовый у
        авиакомпании, удалить нельзя.
      </p>
      <CityTable cities={cities} />
      {params.saved ? <Toast message="Город сохранён." /> : null}
      {params.deleted ? <Toast message="Город удалён." /> : null}
    </div>
  );
}

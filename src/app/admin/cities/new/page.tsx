import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { referenceReturnSchema } from '@/modules/catalog-data';
import { getReferenceLists } from '@/modules/catalog-data/server';
import { CityForm, NEW_CITY_VALUES } from '@/modules/catalog-data/ui';
import { returnPath, withBack } from '@/shared/lib/return-path';

export const metadata: Metadata = { title: 'Новый город — админка', robots: { index: false } };

export default async function NewCityPage(props: PageProps<'/admin/cities/new'>) {
  const params = await props.searchParams;
  const back = returnPath(params.back);
  await requireAdmin(withBack('/admin/cities/new', back));
  // Открыли кнопкой «Добавить» у списка «Откуда» или «Куда» формы рейсов — туда и вернёмся.
  const target = referenceReturnSchema.parse(params.return);
  const returnTo = target === 'flights-airline' ? undefined : target;
  const lists = await getReferenceLists();

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        {returnTo ? (
          <Link href={withBack('/admin/flights/new', back)}>← К новым рейсам</Link>
        ) : (
          <Link href={back ?? '/admin/cities'}>{back ? '← Назад' : '← Все города'}</Link>
        )}
      </p>
      <h1 className="text-3xl">Новый город</h1>
      {returnTo ? (
        <p className="max-w-3xl text-slate">
          Вместе с городом заводится его аэропорт. После сохранения вернётесь к форме рейсов — новый
          аэропорт уже будет выбран в списке.
        </p>
      ) : null}
      <CityForm returnTo={returnTo} back={back} lists={lists} initial={NEW_CITY_VALUES} />
    </div>
  );
}

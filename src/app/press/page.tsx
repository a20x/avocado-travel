import { getPressView } from '@/modules/press/server';
import { PressFilters, PressList, PressSources } from '@/modules/press/ui';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Пресс-центр',
  description:
    'Пресс-релизы Avocado Travel: новые направления, партнёры, сервис и итоги работы. Сортировка и выборка по категории и автору.',
  path: '/press',
});

export default async function PressPage(props: PageProps<'/press'>) {
  const view = getPressView(await props.searchParams);

  return (
    <div className="container-site grid gap-6 py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <header className="grid max-w-2xl gap-2">
          <h1 className="text-3xl">Пресс-центр</h1>
          <p className="text-slate">
            Официальные сообщения Avocado Travel: новые направления, партнёры, изменения в сервисе и
            итоги работы.
          </p>
        </header>
        <PressSources />
      </div>
      <PressFilters view={view} />
      <PressList view={view} />
    </div>
  );
}

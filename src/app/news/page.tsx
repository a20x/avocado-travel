import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { listNews } from '@/modules/news/server';
import { NewsCard } from '@/modules/news/ui';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Pagination } from '@/shared/ui/Pagination';
import { Tabs } from '@/shared/ui/Tabs';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Новости',
  description:
    'Новости Avocado Travel: новые направления, акции и изменения в сервисе. Вместе с новостями RSS-лент — на вкладке «RSS».',
  path: '/news',
});

/** Адрес ленты с рубрикой и страницей; первая страница и «все рубрики» в адрес не пишутся. */
function newsHref(category: string | undefined, page = 1): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  return params.size > 0 ? `/news?${params}` : '/news';
}

/**
 * Новости сайта (сервис ЛР1, L1-S06): только свои новости из базы. Внешние новости из
 * RSS-лент — на вкладке «RSS», вместе с новостями сайта (Этап 12: без дублей разделов).
 */
export default async function NewsPage(props: PageProps<'/news'>) {
  const params = await props.searchParams;
  // Бывшая вкладка «Новости отрасли» — теперь поиск вкладки «RSS» по внешним лентам.
  if (params.source === 'external') permanentRedirect('/rss?view=search&source=external');
  const category = isNewsCategory(params.category) ? params.category : undefined;
  const { items, page, totalPages } = await listNews({ page: params.page, category });

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">Новости</h1>
        <p className="text-slate">
          Новости Avocado Travel: новые направления, акции и изменения в сервисе. Вместе с новостями
          RSS-лент они собраны на вкладке <Link href="/rss">«RSS»</Link>.
        </p>
      </header>
      <Tabs
        label="Рубрики"
        current={newsHref(category)}
        items={[
          { href: newsHref(undefined), label: 'Все' },
          ...Object.entries(NEWS_CATEGORIES).map(([key, label]) => ({
            href: newsHref(key),
            label,
          })),
        ]}
      />
      {items.length === 0 ? (
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="Новостей пока нет"
            text="Загляните позже — или выберите другую рубрику."
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} href={(p) => newsHref(category, p)} />
    </div>
  );
}

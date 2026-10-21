import type { Metadata } from 'next';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { listNews } from '@/modules/news/server';
import { NewsCard } from '@/modules/news/ui';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Pagination } from '@/shared/ui/Pagination';
import { Tabs } from '@/shared/ui/Tabs';

export const metadata: Metadata = {
  title: 'Новости',
  description: 'Новости Avocado Travel: новые направления, акции и изменения в сервисе.',
};

/** Адрес ленты с рубрикой и страницей; первая страница и «все рубрики» в адрес не пишутся. */
function newsHref(category: string | undefined, page = 1): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  return params.size > 0 ? `/news?${params}` : '/news';
}

export default async function NewsPage(props: PageProps<'/news'>) {
  const params = await props.searchParams;
  const category = isNewsCategory(params.category) ? params.category : undefined;
  const { items, page, totalPages } = await listNews({ page: params.page, category });

  return (
    <div className="container-site grid gap-6 py-8">
      <h1 className="text-3xl">Новости</h1>
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

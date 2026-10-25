import { INDUSTRY_CATEGORIES, feedById } from '@/modules/exchange';
import { NEWS_CATEGORIES, isNewsCategory } from '@/modules/news';
import { listIndustryNews, listNews } from '@/modules/news/server';
import { IndustryNewsCard, NewsCard } from '@/modules/news/ui';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Pagination } from '@/shared/ui/Pagination';
import { Tabs } from '@/shared/ui/Tabs';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Новости',
  description:
    'Новости Avocado Travel: новые направления, акции и изменения в сервисе, а также новости авиации и туризма из отраслевых изданий.',
  path: '/news',
});

const INDUSTRY = 'external';

/** Адрес ленты с рубрикой и страницей; первая страница и «все рубрики» в адрес не пишутся. */
function newsHref(category: string | undefined, page = 1): string {
  const params = new URLSearchParams();
  if (category === INDUSTRY) params.set('source', INDUSTRY);
  else if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  return params.size > 0 ? `/news?${params}` : '/news';
}

const industryLabel = (category: string): string =>
  Object.hasOwn(INDUSTRY_CATEGORIES, category)
    ? INDUSTRY_CATEGORIES[category as keyof typeof INDUSTRY_CATEGORIES]
    : 'Отрасль';

export default async function NewsPage(props: PageProps<'/news'>) {
  const params = await props.searchParams;
  const isIndustry = params.source === INDUSTRY;
  const category = isIndustry
    ? INDUSTRY
    : isNewsCategory(params.category)
      ? params.category
      : undefined;

  const tabs = (
    <Tabs
      label="Рубрики"
      current={newsHref(category)}
      items={[
        { href: newsHref(undefined), label: 'Все' },
        ...Object.entries(NEWS_CATEGORIES).map(([key, label]) => ({
          href: newsHref(key),
          label,
        })),
        { href: newsHref(INDUSTRY), label: 'Новости отрасли' },
      ]}
    />
  );

  if (isIndustry) {
    const { items, page, totalPages } = await listIndustryNews({ page: params.page });
    return (
      <div className="container-site grid gap-6 py-8">
        <h1 className="text-3xl">Новости</h1>
        {tabs}
        <p className="max-w-3xl text-sm text-slate">
          Новости авиации и туризма из отраслевых изданий: заголовок и краткое описание, полный
          текст — на сайте источника. Обновляются каждые 6 часов. Новости о реальных авиакомпаниях
          не показываем: авиакомпании на нашем сайте выдуманные.
        </p>
        {items.length === 0 ? (
          <Card>
            <EmptyState
              image="/images/illustrations/no-results.svg"
              title="Новости отрасли ещё не загружены"
              text="Они появятся после ближайшего обновления лент."
            />
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <IndustryNewsCard
                key={item.id}
                item={item}
                sourceName={feedById(item.externalFeed)?.name ?? 'Внешний источник'}
                categoryLabel={industryLabel(item.category)}
              />
            ))}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} href={(p) => newsHref(INDUSTRY, p)} />
      </div>
    );
  }

  const { items, page, totalPages } = await listNews({ page: params.page, category });
  return (
    <div className="container-site grid gap-6 py-8">
      <h1 className="text-3xl">Новости</h1>
      {tabs}
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

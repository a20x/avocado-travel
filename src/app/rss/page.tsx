import { getCurrentUser } from '@/modules/auth/server';
import { getMergedFeed, getRssPage } from '@/modules/exchange/server';
import {
  CombinedNews,
  FeedSources,
  MergedFeed,
  RssSubscribe,
  RssUpload,
} from '@/modules/exchange/ui';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'RSS и обмен данными',
  description:
    'Объединённые новости Avocado Travel и любой RSS-ленты на одной странице, внешние RSS-ленты, разбор RSS-файла и выгрузка новостей в CSV, XML, RSS и ASCII.',
  path: '/rss',
});

const firstParam = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/**
 * Вкладка «RSS» (лаба 4). Первым — то, что проверяет преподаватель: объединённые новости сайта
 * и введённой RSS-ленты, затем общая лента с подключёнными лентами и выгрузками, своя лента
 * для подписки, внешние ленты (администратор подключает их здесь же) и разбор RSS-файла.
 */
export default async function RssPage(props: PageProps<'/rss'>) {
  const searchParams = await props.searchParams;
  const feedUrl = firstParam(searchParams.feed).trim();
  const [page, user, merged] = await Promise.all([
    getRssPage(searchParams),
    getCurrentUser(),
    feedUrl ? getMergedFeed(feedUrl) : Promise.resolve(null),
  ]);

  return (
    <div className="container-site grid gap-10 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">RSS и обмен данными</h1>
        <p className="text-slate">
          Сайт объединяет свои новости из базы данных с новостями RSS-лент, отдаёт свои новости в
          RSS, разбирает чужие ленты на части, а общую ленту можно скачать в форматах для других
          программ.
        </p>
      </header>

      <MergedFeed url={feedUrl} result={merged} feeds={page.feeds} />
      <CombinedNews page={page} />
      <RssSubscribe />
      <FeedSources feeds={page.feeds} isAdmin={user?.role === 'admin'} />
      <RssUpload />
    </div>
  );
}

import { getCurrentUser } from '@/modules/auth/server';
import { getRssPage } from '@/modules/exchange/server';
import { CombinedNews, FeedSources, RssSubscribe, RssUpload } from '@/modules/exchange/ui';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'RSS и обмен данными',
  description:
    'RSS-лента Avocado Travel, внешние RSS-ленты отраслевых изданий, разбор RSS-файла и выгрузка новостей в CSV, XML, RSS и ASCII.',
  path: '/rss',
});

/**
 * Вкладка «RSS» (лаба 4): своя лента для подписки, внешние ленты (администратор подключает их
 * здесь же), разбор загруженного RSS-файла и общая лента с выгрузками в форматах обмена.
 */
export default async function RssPage(props: PageProps<'/rss'>) {
  const [page, user] = await Promise.all([getRssPage(await props.searchParams), getCurrentUser()]);

  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">RSS и обмен данными</h1>
        <p className="text-slate">
          Сайт отдаёт свои новости в RSS, получает новости отраслевых изданий из чужих RSS-лент,
          разбирает их на части и сохраняет в базу, а общую ленту можно скачать в форматах для
          других программ.
        </p>
      </header>

      <RssSubscribe />
      <FeedSources feeds={page.feeds} isAdmin={user?.role === 'admin'} />
      <RssUpload />
      <CombinedNews page={page} />
    </div>
  );
}

import { getCurrentUser } from '@/modules/auth/server';
import { RSS_VIEWS, rssViewHref, rssViewOf, type RssView } from '@/modules/exchange';
import { getMergedFeed, getMergedPreview, getRssPage } from '@/modules/exchange/server';
import {
  CombinedNews,
  CombinedPreview,
  ExportCard,
  FeedSources,
  MergedFeed,
  RssSubscribe,
  RssUpload,
  SiteNewsInput,
} from '@/modules/exchange/ui';
import { NewsForm } from '@/modules/news/ui';
import { pageMetadata } from '@/shared/lib/metadata';
import { dateInZone, timeInZone } from '@/shared/lib/time';
import { Tabs } from '@/shared/ui/Tabs';
import { Toast } from '@/shared/ui/Toast';

export const metadata = pageMetadata({
  title: 'RSS: объединённые новости, ввод, поиск, выгрузка',
  description:
    'Объединённые новости Avocado Travel и любой RSS-ленты с RSS-значком, ввод новостей сайта, подключение RSS-лент, поиск по новостям, выгрузка в CSV, XML, RSS, ASCII и разбор RSS-файла.',
  path: '/rss',
});

const firstParam = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/**
 * Вкладка «RSS» (лаба 4). Меню — понятными словами (замечание преподавателя одногруппнику:
 * ввод новостей сайта, ввод RSS-ленты, поиск и объединённые новости — в одном месте).
 * Первыми открываются объединённые новости сайта и RSS-лент со значком RSS под ними.
 */
export default async function RssPage(props: PageProps<'/rss'>) {
  const searchParams = await props.searchParams;
  const view: RssView = rssViewOf(searchParams);
  const feedUrl = view === 'merged' ? firstParam(searchParams.feed).trim() : '';
  // Каждому разделу — свои данные: ленту не скачиваем, пока адрес не введён.
  const [page, user, merged, preview] = await Promise.all([
    getRssPage(view === 'search' ? searchParams : {}),
    view === 'input' || view === 'feeds' ? getCurrentUser() : null,
    feedUrl ? getMergedFeed(feedUrl) : Promise.resolve(null),
    view === 'merged' && !feedUrl ? getMergedPreview() : Promise.resolve(null),
  ]);
  const isAdmin = user?.role === 'admin';
  const now = new Date();

  return (
    <div className="container-site grid gap-8 py-8">
      <header className="grid max-w-3xl gap-2">
        <h1 className="text-3xl">RSS и обмен данными</h1>
        <p className="text-slate">
          Сайт объединяет свои новости из базы данных с новостями любой RSS-ленты, принимает новые
          новости и ленты, ищет по ним и отдаёт новости в RSS и других форматах для программ.
        </p>
      </header>

      <Tabs
        label="Разделы RSS"
        current={rssViewHref(view)}
        items={(Object.keys(RSS_VIEWS) as RssView[]).map((item) => ({
          href: rssViewHref(item),
          label: RSS_VIEWS[item],
        }))}
      />

      {view === 'merged' ? (
        <>
          <MergedFeed url={feedUrl} result={merged} feeds={page.feeds} />
          {preview ? <CombinedPreview preview={preview} /> : null}
        </>
      ) : null}

      {view === 'input' ? (
        <SiteNewsInput isAdmin={isAdmin}>
          <NewsForm
            returnTo="rss"
            initial={{
              title: '',
              slug: '',
              summary: '',
              body: '',
              category: 'company',
              // По умолчанию — опубликовать сейчас: новость сразу видна в объединённых.
              publishedDate: dateInZone(now, 'Europe/Moscow'),
              publishedTime: timeInZone(now, 'Europe/Moscow'),
            }}
          />
        </SiteNewsInput>
      ) : null}

      {view === 'feeds' ? <FeedSources feeds={page.feeds} isAdmin={isAdmin} /> : null}
      {view === 'search' ? <CombinedNews page={page} /> : null}
      {view === 'export' ? (
        <>
          <ExportCard page={page} />
          <RssSubscribe />
        </>
      ) : null}
      {view === 'upload' ? <RssUpload /> : null}

      {firstParam(searchParams.saved) === 'news' ? (
        <Toast message="Новость сохранена — она уже среди объединённых новостей." />
      ) : null}
    </div>
  );
}

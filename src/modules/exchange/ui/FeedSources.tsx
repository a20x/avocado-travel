import Link from 'next/link';
import { ActionForm } from '@/shared/ui/ActionForm';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { Table } from '@/shared/ui/Table';
import { INDUSTRY_CATEGORIES, MAX_FEEDS, type ExternalFeedStatus } from '../feeds';
import { refreshFeedsAction, removeFeedAction } from '../server/actions';
import { AddFeedForm } from './AddFeedForm';

const checked = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

/**
 * Внешние RSS-ленты (L4-05): откуда сайт получает новости отрасли и как прошёл последний
 * импорт. Администратор здесь же подключает, обновляет и отключает ленты.
 */
export function FeedSources({ feeds, isAdmin }: { feeds: ExternalFeedStatus[]; isAdmin: boolean }) {
  return (
    <Card as="section" aria-labelledby="feeds-title" className="grid gap-4 p-5 md:p-6">
      <div className="grid gap-1">
        <h2 id="feeds-title" className="text-xl">
          Внешние RSS-ленты
        </h2>
        <p className="text-slate">
          Сайт сам скачивает эти ленты каждые 6 часов, разбирает записи на заголовок, описание,
          ссылку и дату, очищает текст от HTML, отбрасывает дубли и старые записи, расставляет теги
          и сохраняет новости в базу — они появляются в общей ленте ниже и в «Новостях отрасли».
        </p>
      </div>

      {feeds.length > 0 ? (
        <Table caption={`Подключённые ленты: ${feeds.length} из ${MAX_FEEDS}`}>
          <thead>
            <tr>
              <th scope="col">Источник</th>
              <th scope="col">Рубрика</th>
              <th scope="col">Последняя проверка</th>
              <th scope="col">Новостей на сайте</th>
              {isAdmin ? <th scope="col">Управление</th> : null}
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => (
              <tr key={feed.id}>
                <td>
                  <span className="font-semibold">{feed.name}</span>
                  <br />
                  <a href={feed.url} className="text-sm break-all" rel="noopener">
                    {feed.url}
                  </a>
                </td>
                <td>{INDUSTRY_CATEGORIES[feed.category]}</td>
                <td className="text-sm">
                  {feed.checkedAt ? `${checked.format(feed.checkedAt)} МСК` : 'ещё не проверялась'}
                  {feed.checkedAt ? (
                    <>
                      <br />
                      <span className={feed.lastError ? 'text-error' : 'text-slate'}>
                        {feed.lastError
                          ? `ошибка: ${feed.lastError}`
                          : `добавлено ${feed.lastAdded}`}
                      </span>
                    </>
                  ) : null}
                </td>
                <td className="tabular-nums">
                  <Link href={`/rss?source=${feed.id}`}>{feed.newsCount}</Link>
                </td>
                {isAdmin ? (
                  <td>
                    <ConfirmButton
                      label="Отключить"
                      variant="ghost"
                      title="Отключить ленту?"
                      text={`Лента «${feed.name}» больше не будет импортироваться, а её ${feed.newsCount} новостей исчезнут с сайта.`}
                      confirmLabel="Отключить"
                      action={removeFeedAction}
                      permalink="/rss"
                    >
                      <input type="hidden" name="id" value={feed.id} />
                    </ConfirmButton>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-slate">Внешних лент пока нет.</p>
      )}

      {isAdmin ? (
        <div className="grid gap-4 border-t border-line pt-4">
          <h3 className="text-lg">Подключить ленту</h3>
          <AddFeedForm />
          <div>
            <ActionForm action={refreshFeedsAction} permalink="/rss">
              <Button type="submit" variant="secondary">
                Обновить все ленты сейчас
              </Button>
            </ActionForm>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate">
          Подключать и отключать ленты может администратор —{' '}
          <Link href="/login?next=%2Frss">войти</Link>.
        </p>
      )}
    </Card>
  );
}

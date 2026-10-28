import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

/** Своя лента сайта для подписки (L4-02): RSS 2.0 и тот же список в JSON Feed. */
export function RssSubscribe() {
  return (
    <Card as="section" aria-labelledby="subscribe-title" className="grid gap-3 p-5 md:p-6">
      <h2 id="subscribe-title" className="text-xl">
        RSS-подписка Avocado Travel
      </h2>
      <p className="text-slate">
        20 последних новостей сайта в формате RSS 2.0: адрес ленты можно добавить в любую читалку
        новостей, и новые записи придут сами. Тот же список есть в формате JSON Feed — для программ.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href="/feed.xml" className={buttonClasses()}>
          Открыть RSS-ленту
        </a>
        <a href="/feed.json" className={buttonClasses({ variant: 'secondary' })}>
          JSON Feed
        </a>
        <a href="/api/docs" className={buttonClasses({ variant: 'secondary' })}>
          REST API и выгрузки
        </a>
      </div>
    </Card>
  );
}

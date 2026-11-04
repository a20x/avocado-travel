import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

/**
 * Раздел «Ввод новостей сайта» вкладки «RSS»: администратор пишет новость здесь же
 * (форма — из модуля news, приходит в `children`), после сохранения она сразу среди
 * объединённых новостей и в RSS-ленте сайта. Остальным — кто вводит новости и вход.
 */
export function SiteNewsInput({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby="news-input-title" className="grid gap-4">
      <div className="grid max-w-3xl gap-1">
        <h2 id="news-input-title" className="text-2xl">
          Ввод новостей сайта
        </h2>
        <p className="text-slate">
          Новость сохраняется в базу данных сайта и сразу появляется в «Объединённых новостях», в
          RSS-ленте сайта <a href="/feed.xml">/feed.xml</a> и в разделе «Новости». Отзывы
          посетителей — в гостевой книге и на форуме, это не новости.
        </p>
      </div>
      {isAdmin ? (
        <>
          {children}
          <p>
            <Link href="/admin/news">Все новости сайта — правка и удаление</Link>
          </p>
        </>
      ) : (
        <Card className="grid gap-3 p-5 md:p-6">
          <p>
            Новости сайта пишет администратор: это официальные сообщения Avocado Travel, поэтому
            вводить их может только он.
          </p>
          <p>
            <Link href="/login?next=%2Frss%3Fview%3Dinput" className={buttonClasses()}>
              Войти как администратор
            </Link>
          </p>
        </Card>
      )}
    </section>
  );
}

import Link from 'next/link';
import { HELP_SECTIONS } from '@/modules/help';
import { HelpArticle, HelpContents } from '@/modules/help/ui';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Справка',
  description:
    'Ответы на частые вопросы: поиск рейсов, выбор мест, бронирование, демо-оплата, отмена заказа и сервисы сайта.',
  path: '/help',
});

export default function HelpPage() {
  return (
    <div className="container-site grid gap-6 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Справка</h1>
        <p className="text-slate">
          Ответы на частые вопросы. Не нашли свой — спросите на <Link href="/forum">форуме</Link>{' '}
          или поищите по сайту.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <HelpContents sections={HELP_SECTIONS} />
        <HelpArticle sections={HELP_SECTIONS} />
      </div>
    </div>
  );
}

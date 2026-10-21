import type { Metadata } from 'next';
import { requireAdmin } from '@/modules/auth/server';
import { listBannedHosts, listStopWords } from '@/modules/guestbook/server';
import { AdminRules } from '@/modules/guestbook/ui';
import { AdminGuestbookHeader } from '../AdminGuestbookHeader';

export const metadata: Metadata = {
  title: 'Запреты гостевой книги — админка',
  robots: { index: false },
};

export default async function AdminGuestbookRulesPage() {
  await requireAdmin('/admin/guestbook/rules');
  const [words, hosts] = await Promise.all([listStopWords(), listBannedHosts()]);

  return (
    <div className="container-site grid gap-6 py-8">
      <AdminGuestbookHeader current="/admin/guestbook/rules" />
      <AdminRules words={words} hosts={hosts} />
    </div>
  );
}

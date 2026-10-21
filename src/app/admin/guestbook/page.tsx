import type { Metadata } from 'next';
import { requireAdmin } from '@/modules/auth/server';
import { listBannedHosts, listEntriesForAdmin } from '@/modules/guestbook/server';
import { AdminEntries } from '@/modules/guestbook/ui';
import { Pagination } from '@/shared/ui/Pagination';
import { Toast } from '@/shared/ui/Toast';
import { AdminGuestbookHeader } from './AdminGuestbookHeader';

export const metadata: Metadata = { title: 'Гостевая книга — админка', robots: { index: false } };

export default async function AdminGuestbookPage(props: PageProps<'/admin/guestbook'>) {
  await requireAdmin('/admin/guestbook');
  const params = await props.searchParams;
  const [{ items, page, totalPages }, hosts] = await Promise.all([
    listEntriesForAdmin({ page: params.page }),
    listBannedHosts(),
  ]);

  return (
    <div className="container-site grid gap-6 py-8">
      <AdminGuestbookHeader current="/admin/guestbook" />
      <AdminEntries entries={items} bannedIps={new Set(hosts.map((host) => host.pattern))} />
      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => (p > 1 ? `/admin/guestbook?page=${p}` : '/admin/guestbook')}
      />
      {params.deleted ? <Toast message="Запись удалена." /> : null}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listCampaigns } from '@/modules/ads/server';
import { CampaignTable } from '@/modules/ads/ui';
import { buttonClasses } from '@/shared/ui/Button';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Реклама — админка', robots: { index: false } };

export default async function AdminAdsPage(props: PageProps<'/admin/ads'>) {
  await requireAdmin('/admin/ads');
  const [campaigns, params] = await Promise.all([listCampaigns(), props.searchParams]);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl">Реклама</h1>
          <p className="text-slate">
            Показ засчитывается, когда страница с блоком отдана посетителю, клик — при переходе по
            нему. CTR — доля кликов от показов.
          </p>
        </div>
        <Link href="/admin/ads/new" className={buttonClasses()}>
          Новая кампания
        </Link>
      </header>
      <CampaignTable campaigns={campaigns} now={new Date()} />
      {params.saved === '1' ? <Toast message="Кампания сохранена." /> : null}
    </div>
  );
}

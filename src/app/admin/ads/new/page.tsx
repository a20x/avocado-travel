import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { CampaignForm } from '@/modules/ads/ui';
import { addDays, dateInZone } from '@/shared/lib/time';

export const metadata: Metadata = { title: 'Новая кампания — админка', robots: { index: false } };

export default async function NewCampaignPage() {
  await requireAdmin('/admin/ads/new');
  const today = dateInZone(new Date(), 'Europe/Moscow');

  return (
    <div className="container-site grid max-w-3xl gap-6 py-8">
      <p>
        <Link href="/admin/ads">← Реклама</Link>
      </p>
      <h1 className="text-3xl">Новая кампания</h1>
      <CampaignForm
        initial={{
          title: '',
          text: '',
          image: '/images/ads/early-booking.svg',
          targetUrl: '',
          placement: 'home',
          startDate: today,
          endDate: addDays(today, 29),
          isEnabled: true,
        }}
      />
    </div>
  );
}

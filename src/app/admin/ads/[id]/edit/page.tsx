import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { datesFromPeriod } from '@/modules/ads';
import { requireAdmin } from '@/modules/auth/server';
import { getCampaign } from '@/modules/ads/server';
import { CampaignForm } from '@/modules/ads/ui';

export const metadata: Metadata = { title: 'Кампания — админка', robots: { index: false } };

export default async function EditCampaignPage(props: PageProps<'/admin/ads/[id]/edit'>) {
  const { id } = await props.params;
  await requireAdmin(`/admin/ads/${id}/edit`);
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  return (
    <div className="container-site grid max-w-3xl gap-6 py-8">
      <p>
        <Link href="/admin/ads">← Реклама</Link>
      </p>
      <h1 className="text-3xl">{campaign.title}</h1>
      <CampaignForm
        id={campaign.id}
        initial={{
          title: campaign.title,
          text: campaign.text,
          image: campaign.image,
          targetUrl: campaign.targetUrl,
          placement: campaign.placement,
          isEnabled: campaign.isEnabled,
          ...datesFromPeriod(campaign),
        }}
      />
    </div>
  );
}

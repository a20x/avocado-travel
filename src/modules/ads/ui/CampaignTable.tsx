import Link from 'next/link';
import { formatDate } from '@/shared/lib/format';
import { ActionForm } from '@/shared/ui/ActionForm';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { Table } from '@/shared/ui/Table';
import {
  PLACEMENTS,
  adStatus,
  ctr,
  datesFromPeriod,
  type AdCampaign,
  type AdStats,
  type AdStatus,
} from '../model';
import {
  deleteCampaignAction,
  disableCampaignAction,
  enableCampaignAction,
} from '../server/actions';

const PATH = '/admin/ads';

const STATUS: Record<AdStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'показывается', tone: 'success' },
  scheduled: { label: 'запланирована', tone: 'warning' },
  finished: { label: 'завершена', tone: 'muted' },
  disabled: { label: 'выключена', tone: 'muted' },
};

const number = (value: number) => value.toLocaleString('ru-RU');

/** Кампании со статистикой показов и кликов (L1-S12). */
export function CampaignTable({
  campaigns,
  now,
}: {
  campaigns: Array<AdCampaign & AdStats>;
  now: Date;
}) {
  return (
    <Table caption="Рекламные кампании, свежие сверху">
      <thead>
        <tr>
          <th scope="col">Кампания</th>
          <th scope="col">Период</th>
          <th scope="col">Показы</th>
          <th scope="col">Клики</th>
          <th scope="col">CTR</th>
          <th scope="col">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {campaigns.map((campaign) => {
          const status = STATUS[adStatus(campaign, now)];
          const { startDate, endDate } = datesFromPeriod(campaign);
          const rate = ctr(campaign);
          return (
            <tr key={campaign.id}>
              <td className="min-w-64">
                <Link href={`/admin/ads/${campaign.id}/edit`} className="font-semibold">
                  {campaign.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {PLACEMENTS[campaign.placement]}
                </div>
              </td>
              <td className="text-sm whitespace-nowrap">
                {formatDate(startDate)} — {formatDate(endDate)}
              </td>
              <td className="tabular-nums">{number(campaign.impressions)}</td>
              <td className="tabular-nums">{number(campaign.clicks)}</td>
              <td className="whitespace-nowrap tabular-nums">
                {rate === null ? '—' : `${rate.toLocaleString('ru-RU')}%`}
              </td>
              <td>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <ActionForm
                    action={campaign.isEnabled ? disableCampaignAction : enableCampaignAction}
                    permalink={PATH}
                  >
                    <input type="hidden" name="id" value={campaign.id} />
                    <Button type="submit" variant="ghost">
                      {campaign.isEnabled ? 'Выключить' : 'Включить'}
                      <span className="sr-only"> кампанию «{campaign.title}»</span>
                    </Button>
                  </ActionForm>
                  <ConfirmButton
                    label="Удалить"
                    title="Удалить кампанию?"
                    text={`Кампания «${campaign.title}» будет удалена вместе со статистикой показов и кликов.`}
                    confirmLabel="Удалить"
                    action={deleteCampaignAction}
                    permalink={PATH}
                  >
                    <input type="hidden" name="id" value={campaign.id} />
                  </ConfirmButton>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

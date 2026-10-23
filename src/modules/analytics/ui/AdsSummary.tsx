import { Table } from '@/shared/ui/Table';

const number = new Intl.NumberFormat('ru-RU');

type AdRow = { id: number; title: string; impressions: number; clicks: number; ctr: number | null };

/** Статистика рекламы (L1-S12) за всё время: показы, клики, CTR по кампаниям. */
export function AdsSummary({ campaigns }: { campaigns: AdRow[] }) {
  return (
    <Table caption="Рекламные кампании за всё время">
      <thead>
        <tr>
          <th scope="col">Кампания</th>
          <th scope="col" className="text-right">
            Показы
          </th>
          <th scope="col" className="text-right">
            Клики
          </th>
          <th scope="col" className="text-right">
            CTR
          </th>
        </tr>
      </thead>
      <tbody>
        {campaigns.map((campaign) => (
          <tr key={campaign.id}>
            <td>{campaign.title}</td>
            <td className="text-right tabular-nums">{number.format(campaign.impressions)}</td>
            <td className="text-right tabular-nums">{number.format(campaign.clicks)}</td>
            <td className="text-right tabular-nums">
              {campaign.ctr === null ? '—' : `${campaign.ctr.toLocaleString('ru-RU')}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

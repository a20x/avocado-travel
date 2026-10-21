import { ActionForm } from '@/shared/ui/ActionForm';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { Table } from '@/shared/ui/Table';
import type { GuestbookEntry } from '../model';
import {
  banEntryIpAction,
  deleteEntryAction,
  hideEntryAction,
  showEntryAction,
} from '../server/actions';
import { entryDate } from './format';

const PATH = '/admin/guestbook';

function Status({ entry }: { entry: GuestbookEntry }) {
  if (entry.isVisible) return <Badge tone="success">видна</Badge>;
  return (
    <Badge tone={entry.hiddenReason === 'stop_word' ? 'warning' : 'muted'}>
      {entry.hiddenReason === 'stop_word' ? 'скрыта: слово' : 'скрыта админом'}
    </Badge>
  );
}

/** Все записи с действиями модерации (docs/02-product.md, «Модерация гостевой книги»). */
export function AdminEntries({
  entries,
  bannedIps,
}: {
  entries: GuestbookEntry[];
  bannedIps: Set<string>;
}) {
  return (
    <Table caption="Записи гостевой книги, новые сверху">
      <thead>
        <tr>
          <th scope="col">Запись</th>
          <th scope="col">IP</th>
          <th scope="col">Статус</th>
          <th scope="col">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td className="min-w-72">
              <p className="font-semibold">
                {entry.authorName}{' '}
                <span className="text-sm font-normal text-slate">{entryDate(entry.createdAt)}</span>
              </p>
              <p className="line-clamp-3 break-words whitespace-pre-line">{entry.message}</p>
            </td>
            <td className="text-sm whitespace-nowrap">{entry.ip ?? '—'}</td>
            <td className="whitespace-nowrap">
              <Status entry={entry} />
            </td>
            <td>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <ActionForm
                  action={entry.isVisible ? hideEntryAction : showEntryAction}
                  permalink={PATH}
                >
                  <input type="hidden" name="id" value={entry.id} />
                  <Button type="submit" variant="ghost">
                    {entry.isVisible ? 'Скрыть' : 'Показать'}
                    <span className="sr-only"> запись: {entry.authorName}</span>
                  </Button>
                </ActionForm>
                {entry.ip && !bannedIps.has(entry.ip) ? (
                  <ActionForm action={banEntryIpAction} permalink={PATH}>
                    <input type="hidden" name="ip" value={entry.ip} />
                    <Button type="submit" variant="ghost">
                      Запретить IP
                    </Button>
                  </ActionForm>
                ) : null}
                <ConfirmButton
                  label="Удалить"
                  title="Удалить запись?"
                  text={`Запись «${entry.authorName}» будет удалена насовсем.`}
                  confirmLabel="Удалить"
                  action={deleteEntryAction}
                  permalink={PATH}
                >
                  <input type="hidden" name="id" value={entry.id} />
                </ConfirmButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

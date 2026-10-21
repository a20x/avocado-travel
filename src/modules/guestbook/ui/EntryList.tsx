import { Card } from '@/shared/ui/Card';
import type { PublicEntry } from '../model';
import { entryDate } from './format';

/** Записи гостевой книги для посетителей. Переносы строк в сообщении сохраняются. */
export function EntryList({ entries }: { entries: PublicEntry[] }) {
  return (
    <ol className="grid gap-4">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Card as="article" className="grid gap-2 p-5">
            <header className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h3 className="text-lg">{entry.authorName}</h3>
              <time dateTime={entry.createdAt.toISOString()} className="text-sm text-slate">
                {entryDate(entry.createdAt)}
              </time>
            </header>
            <p className="break-words whitespace-pre-line">{entry.message}</p>
          </Card>
        </li>
      ))}
    </ol>
  );
}

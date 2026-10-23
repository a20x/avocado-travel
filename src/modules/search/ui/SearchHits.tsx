import Link from 'next/link';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { SEARCH_KINDS, type SearchHit } from '../model';
import { Highlighted } from './Highlighted';

/** Найденные документы: вид, заголовок-ссылка и отрывок с найденными словами. */
export function SearchHits({ hits }: { hits: SearchHit[] }) {
  return (
    <ol className="grid gap-3">
      {hits.map((hit) => (
        <li key={hit.id}>
          <Card as="article" className="grid gap-2 p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge tone="muted">{SEARCH_KINDS[hit.kind]}</Badge>
              <span className="text-sm break-all text-slate">{hit.url}</span>
            </div>
            <h2 className="text-lg">
              <Link href={hit.url}>
                <Highlighted text={hit.title} />
              </Link>
            </h2>
            <p className="text-sm break-words">
              <Highlighted text={hit.snippet} />
            </p>
          </Card>
        </li>
      ))}
    </ol>
  );
}

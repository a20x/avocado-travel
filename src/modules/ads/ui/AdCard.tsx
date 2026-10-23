import Image from 'next/image';
import { cn } from '@/shared/lib/cn';
import type { AdView } from '../model';

/**
 * Рекламный блок (L1-S12). Вся карточка — ссылка через `/go/ad/[id]`: так считается клик.
 * Обычная ссылка, а не Link: Next.js не должен заранее загружать адрес перехода — иначе
 * клик засчитывался бы без нажатия. Пометка «Реклама» — чтобы посетитель отличал её от рейсов.
 */
export function AdCard({
  ad,
  layout = 'vertical',
}: {
  ad: AdView;
  layout?: 'vertical' | 'horizontal';
}) {
  const horizontal = layout === 'horizontal';
  return (
    <a
      href={`/go/ad/${ad.id}`}
      rel="sponsored"
      className={cn(
        'group grid overflow-hidden rounded-md bg-white text-graphite no-underline shadow-card transition-shadow hover:shadow-lg',
        horizontal && 'sm:grid-cols-[14rem_minmax(0,1fr)]',
      )}
    >
      <Image
        src={ad.image}
        alt=""
        width={600}
        height={300}
        className={cn('h-auto w-full', horizontal && 'sm:h-full sm:object-cover')}
      />
      <span className="grid content-start gap-1.5 p-4">
        <span className="text-xs tracking-wide text-slate uppercase">Реклама</span>
        <span className="text-lg font-semibold group-hover:text-leaf">{ad.title}</span>
        <span className="text-sm text-slate">{ad.text}</span>
      </span>
    </a>
  );
}

/** Промо-блоки на главной (docs/06-design.md): после популярных направлений. */
export function PromoBlocks({ ads }: { ads: AdView[] }) {
  if (ads.length === 0) return null;
  return (
    <section aria-labelledby="promo-title" className="grid gap-5">
      <h2 id="promo-title" className="text-2xl">
        Специальные предложения
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((ad) => (
          <AdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
}

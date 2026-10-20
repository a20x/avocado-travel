import Image from 'next/image';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** Иллюстрация из public/images/illustrations, например '/images/illustrations/no-results.svg'. */
  image: string;
  title: string;
  text?: string;
  action?: ReactNode;
};

/** Пустое состояние: «рейсы не найдены», «заказов пока нет». */
export function EmptyState({ image, title, text, action }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-10 text-center">
      {/* Иллюстрация декоративная: смысл передаёт заголовок, поэтому alt пустой. */}
      <Image src={image} alt="" width={260} height={189} />
      <h2 className="text-xl">{title}</h2>
      {text ? <p className="max-w-md text-slate">{text}</p> : null}
      {action}
    </div>
  );
}

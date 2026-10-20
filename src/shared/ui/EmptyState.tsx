import Image from 'next/image';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** Иллюстрация из public/images/illustrations, например '/images/illustrations/no-results.svg'. */
  image: string;
  title: string;
  /** h1 — когда пустое состояние и есть вся страница (404, 500). */
  titleAs?: 'h1' | 'h2';
  text?: string;
  action?: ReactNode;
};

/** Пустое состояние: «рейсы не найдены», «заказов пока нет», страницы ошибок. */
export function EmptyState({ image, title, titleAs: Title = 'h2', text, action }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-10 text-center">
      {/* Иллюстрация декоративная: смысл передаёт заголовок, поэтому alt пустой. */}
      <Image src={image} alt="" width={260} height={189} />
      <Title className={Title === 'h1' ? 'text-3xl' : 'text-xl'}>{title}</Title>
      {text ? <p className="max-w-md text-slate">{text}</p> : null}
      {action}
    </div>
  );
}

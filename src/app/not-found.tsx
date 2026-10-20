import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClasses } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';

export const metadata: Metadata = {
  title: 'Страница не найдена',
};

export default function NotFound() {
  return (
    <div className="container-site py-8">
      <EmptyState
        image="/images/illustrations/not-found.svg"
        titleAs="h1"
        title="Страница не найдена"
        text="Возможно, адрес набран с ошибкой или страница переехала. Начните с главной или загляните в справку."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonClasses()}>
              На главную
            </Link>
            <Link href="/help" className={buttonClasses({ variant: 'secondary' })}>
              Справка
            </Link>
          </div>
        }
      />
    </div>
  );
}

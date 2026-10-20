'use client';

// Граница ошибок обязана быть клиентским компонентом (требование Next.js).
import Link from 'next/link';
import { useEffect } from 'react';
import { Button, buttonClasses } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';

/** Страница 500: неожиданная ошибка на странице. Шапка и подвал остаются на месте. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Подробности — разработчику в консоль; посетителю — понятный текст без технических деталей.
    console.error(error);
  }, [error]);

  return (
    <div className="container-site py-8">
      <EmptyState
        image="/images/illustrations/error.svg"
        titleAs="h1"
        title="Что-то пошло не так"
        text="Мы уже знаем об ошибке. Попробуйте обновить страницу через минуту."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => retry()}>Попробовать снова</Button>
            <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
              На главную
            </Link>
          </div>
        }
      />
    </div>
  );
}

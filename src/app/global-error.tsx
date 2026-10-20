'use client';

// Срабатывает, если сломался сам корневой макет (шапка, подвал). Заменяет его целиком,
// поэтому сам подключает стили и задаёт <html> и <body> (требование Next.js).
import { useEffect } from 'react';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import './globals.css';

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <title>Ошибка — Avocado Travel</title>
        <EmptyState
          image="/images/illustrations/error.svg"
          titleAs="h1"
          title="Что-то пошло не так"
          text="Сайт временно не работает. Попробуйте обновить страницу через минуту."
          action={<Button onClick={() => retry()}>Попробовать снова</Button>}
        />
      </body>
    </html>
  );
}

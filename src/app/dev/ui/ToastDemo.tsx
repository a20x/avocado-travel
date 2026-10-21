'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Toast } from '@/shared/ui/Toast';

/** Уведомление появляется по кнопке: на витрине оно не должно висеть поверх остального. */
export function ToastDemo() {
  const [shown, setShown] = useState(0);
  return (
    <>
      <Button variant="secondary" onClick={() => setShown((n) => n + 1)}>
        Показать уведомление
      </Button>
      {shown > 0 ? (
        <Toast key={shown} message="Оплата прошла. Билеты — в личном кабинете." />
      ) : null}
    </>
  );
}

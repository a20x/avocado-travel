'use client';

import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  /** Через сколько миллисекунд уведомление скроется само. */
  duration?: number;
};

/**
 * Короткое уведомление внизу экрана: «Оплата прошла». Скрывается само или по кнопке.
 * role="status" — экранный диктор зачитает текст, не прерывая пользователя.
 */
export function Toast({ message, duration = 6000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-md bg-graphite py-3 pr-2 pl-4 text-white shadow-card sm:right-6 sm:bottom-6 sm:left-auto"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Закрыть уведомление"
        className="flex size-8 shrink-0 items-center justify-center rounded-sm text-lg hover:bg-slate"
      >
        ×
      </button>
    </div>
  );
}

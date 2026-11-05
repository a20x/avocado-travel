'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Широкое окно — для большой формы. */
  wide?: boolean;
  children: ReactNode;
};

/**
 * Модальное окно на стандартном <dialog>: фокус внутри окна, закрытие по Esc и недоступность
 * остальной страницы браузер даёт сам (docs/06-design.md, «Компоненты»).
 */
export function Dialog({ open, onClose, title, wide = false, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Щелчок по затемнению вокруг окна тоже закрывает его.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto rounded-md bg-white p-0 text-graphite shadow-card backdrop:bg-graphite/50',
        wide ? 'w-[min(56rem,calc(100%-2rem))]' : 'w-[min(28rem,calc(100%-2rem))]',
      )}
    >
      <div className="grid gap-4 p-6">
        <h2 id={titleId} className="text-xl">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** Серая заглушка на месте содержимого, пока оно загружается. Размер задаётся классами. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-sm bg-line', className)} />;
}

/**
 * Область загрузки: заглушки видны глазами, а экранный диктор слышит подпись.
 * `label` — например «Ищем рейсы».
 */
export function SkeletonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" className="grid gap-4">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

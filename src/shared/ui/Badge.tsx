import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'muted' | 'error';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-mist text-graphite',
  accent: 'bg-pit text-white',
  success: 'bg-sage-light text-leaf',
  warning: 'bg-warning-bg text-warning',
  muted: 'bg-mist text-slate',
  error: 'bg-error-bg text-error',
};

/** Короткая метка: цена «от 3 900 ₽», «выгодно», статус заказа. */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn('inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold', TONES[tone])}
    >
      {children}
    </span>
  );
}

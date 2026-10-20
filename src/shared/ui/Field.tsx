import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/** Общий вид полей ввода: рамка line-strong, при фокусе — leaf. */
export const fieldControlClasses =
  'w-full rounded-sm border-2 border-line-strong bg-white px-3 py-2 text-base text-graphite placeholder:text-slate focus:border-leaf focus:outline-none aria-[invalid=true]:border-error';

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Обёртка поля: подпись, само поле, подсказка или ошибка.
 * Подпись связана с полем через id — у каждого поля есть подпись (docs/06-design.md).
 */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('grid content-start gap-1', className)}>
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-sm text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Атрибуты доступности для поля внутри Field. */
export function fieldA11y(id: string, { hint, error }: { hint?: string; error?: string }) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? `${id}-message` : undefined,
  };
}

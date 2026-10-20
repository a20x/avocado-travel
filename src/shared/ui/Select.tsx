import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Field, fieldA11y, fieldControlClasses } from './Field';

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> & {
  name: string;
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
};

/**
 * Выпадающий список на стандартном <select>: управление с клавиатуры и экранным диктором
 * браузер даёт сам, без сторонних библиотек.
 */
export function Select({ name, label, options, hint, error, className, ...props }: SelectProps) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          name={name}
          className={cn(fieldControlClasses, 'appearance-none pr-10')}
          {...fieldA11y(id, { hint, error })}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate"
        >
          ▾
        </span>
      </div>
    </Field>
  );
}

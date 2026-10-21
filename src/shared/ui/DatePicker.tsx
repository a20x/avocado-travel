import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Field, fieldA11y, fieldControlClasses, inlineFieldClasses } from './Field';

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  name: string;
  label: string;
  /** `YYYY-MM-DD`: раньше и позже этих дат выбрать нельзя. */
  min?: string;
  max?: string;
  hint?: string;
  error?: string;
  /** inline — поле внутри предложения, подпись видна только экранному диктору. */
  variant?: 'field' | 'inline';
};

/**
 * Выбор даты на стандартном <input type="date">: календарь, ввод с клавиатуры и формат даты
 * по языку системы браузер даёт сам. Границы min/max браузер тоже проверяет, но сервер
 * всё равно проверяет дату заново.
 */
export function DatePicker({
  name,
  label,
  hint,
  error,
  variant = 'field',
  className,
  ...props
}: DatePickerProps) {
  const id = `field-${name}`;

  if (variant === 'inline') {
    return (
      <>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          type="date"
          id={id}
          name={name}
          className={cn(inlineFieldClasses, className)}
          {...props}
        />
      </>
    );
  }

  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <input
        type="date"
        name={name}
        className={fieldControlClasses}
        {...fieldA11y(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}

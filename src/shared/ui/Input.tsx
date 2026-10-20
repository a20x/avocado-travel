import type { InputHTMLAttributes } from 'react';
import { Field, fieldA11y, fieldControlClasses } from './Field';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

/** Текстовое поле с подписью. id строится из name, чтобы подпись всегда была связана с полем. */
export function Input({ name, label, hint, error, className, ...props }: InputProps) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <input
        name={name}
        className={fieldControlClasses}
        {...fieldA11y(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}

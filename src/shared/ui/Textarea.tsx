import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Field, fieldA11y, fieldControlClasses } from './Field';

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

/** Многострочное поле с подписью — текст новости, сообщение в гостевой книге. */
export function Textarea({ name, label, hint, error, className, ...props }: TextareaProps) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        name={name}
        className={cn(fieldControlClasses, 'min-h-28 resize-y')}
        {...fieldA11y(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}

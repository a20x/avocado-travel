'use client';

import { useState } from 'react';
import { Field, fieldA11y, fieldControlClasses } from '@/shared/ui/Field';

export function PasswordInput({
  autoComplete,
  hint,
  error,
}: {
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = 'field-password';

  return (
    <Field id={id} label="Пароль" hint={hint} error={error}>
      <div className="relative">
        <input
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className={`${fieldControlClasses} pr-12`}
          {...fieldA11y(id, { hint, error })}
        />
        <button
          type="button"
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-sm text-slate hover:text-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </Field>
  );
}

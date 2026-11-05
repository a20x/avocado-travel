'use client';

// Клиентский компонент: окно «Добавить» и новое значение в списке — без перезагрузки страницы.
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { mergeOptions, type AddableReferenceKind } from '../model';
import { addReferenceValueAction } from '../server/actions';

type ReferenceSelectProps = {
  name: string;
  label: string;
  /** Пустой пункт списка: «Выберите страну». */
  placeholder: string;
  /** Что добавляет кнопка — для экранного диктора: «+ Добавить страну». */
  what: string;
  /** Заголовок окна кнопки «Добавить». */
  title: string;
  options: SelectOption[];
  defaultValue: string;
  hint?: string;
  error?: string;
  idPrefix?: string;
  /** Широкое окно — для большой формы. */
  wide?: boolean;
  /** Форма нового значения; `done` — значение сохранено, `cancel` — закрыть окно. */
  children: (done: (option: SelectOption) => void, cancel: () => void) => ReactNode;
};

/**
 * Выпадающий список и рядом кнопка «+ Добавить» (замечание преподавателя по лабе 3). Кнопка
 * открывает окно с формой нового значения, и оно сразу появляется в списке и уже выбрано.
 * Введённое в остальных полях формы не теряется: страница остаётся та же.
 */
export function ReferenceSelect({
  name,
  label,
  placeholder,
  what,
  title,
  options,
  defaultValue,
  hint,
  error,
  idPrefix = '',
  wide = false,
  children,
}: ReferenceSelectProps) {
  const [added, setAdded] = useState<SelectOption[]>([]);
  const [chosen, setChosen] = useState(defaultValue);
  // Новое значение в список попадает пересозданием <select>: так оно выбирается и в браузере.
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  const all = mergeOptions(options, added);

  // Окно закрылось вместе с новым значением — фокус на списке, где оно теперь выбрано.
  useEffect(() => {
    if (version > 0) document.getElementById(`${idPrefix}field-${name}`)?.focus();
  }, [version, idPrefix, name]);

  const done = (option: SelectOption) => {
    setAdded((current) => [...current, option]);
    setChosen(option.value);
    setVersion((current) => current + 1);
    setOpen(false);
  };

  return (
    // На узком экране кнопка — под списком: иначе его подпись обрезается.
    <div className="grid gap-2 lg:flex lg:items-start">
      <Select
        key={version}
        name={name}
        label={label}
        idPrefix={idPrefix}
        options={[{ value: '', label: placeholder }, ...all]}
        defaultValue={chosen}
        onChange={(event) => setChosen(event.target.value)}
        hint={hint}
        error={error}
        className="min-w-0 flex-1"
      />
      {/* Отступ — высота подписи: кнопка на одном уровне со списком, даже если под ним ошибка. */}
      <Button
        type="button"
        variant="secondary"
        className="justify-self-start lg:mt-7"
        onClick={() => setOpen(true)}
      >
        + Добавить<span className="sr-only"> {what}</span>
      </Button>
      {/* Окно — в конце страницы: форма внутри формы в HTML не допускается. */}
      {open
        ? createPortal(
            <Dialog open onClose={() => setOpen(false)} title={title} wide={wide}>
              {children(done, () => setOpen(false))}
            </Dialog>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Подписи списков из таблицы `reference_values`. */
const KIND_TEXTS: Record<
  AddableReferenceKind,
  { label: string; placeholder: string; what: string; title: string; hint?: string }
> = {
  country: {
    label: 'Страна',
    placeholder: 'Выберите страну',
    what: 'страну',
    title: 'Новая страна',
  },
  timezone: {
    label: 'Часовой пояс',
    placeholder: 'Выберите часовой пояс',
    what: 'часовой пояс',
    title: 'Новый часовой пояс',
    hint: 'Латиницей, например Asia/Tokyo.',
  },
  airline_type: {
    label: 'Тип авиакомпании',
    placeholder: 'Выберите тип',
    what: 'тип авиакомпании',
    title: 'Новый тип авиакомпании',
  },
};

/** Форма окна «Добавить»: одно поле, значение сохраняется в базу сразу. */
function ReferenceValueForm({
  kind,
  done,
  cancel,
}: {
  kind: AddableReferenceKind;
  done: (value: string) => void;
  cancel: () => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { label, hint } = KIND_TEXTS[kind];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('value');
    startTransition(async () => {
      const result = await addReferenceValueAction(kind, value);
      if ('error' in result) setError(result.error);
      else done(result.value);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Input
        name="value"
        label={label}
        idPrefix="new-"
        autoComplete="off"
        hint={hint}
        error={error}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Button type="button" variant="secondary" onClick={cancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

/** Список значений из таблицы `reference_values` с кнопкой «+ Добавить». */
export function ReferenceValueSelect({
  kind,
  name,
  values,
  defaultValue,
  error,
  hint,
  idPrefix,
}: {
  kind: AddableReferenceKind;
  name: string;
  values: string[];
  defaultValue: string;
  error?: string;
  hint?: string;
  idPrefix?: string;
}) {
  const { label, placeholder, what, title } = KIND_TEXTS[kind];
  return (
    <ReferenceSelect
      name={name}
      label={label}
      placeholder={placeholder}
      what={what}
      title={title}
      options={values.map((value) => ({ value, label: value }))}
      defaultValue={defaultValue}
      error={error}
      hint={hint}
      idPrefix={idPrefix}
    >
      {(done, cancel) => (
        <ReferenceValueForm
          kind={kind}
          cancel={cancel}
          done={(value) => done({ value, label: value })}
        />
      )}
    </ReferenceSelect>
  );
}

'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { MAX_DEPTH } from '../model';
import { addLinkAction, addSectionAction, type CatalogFormState } from '../server/actions';

type SectionOption = { id: number; title: string; depth: number };

const PATH = '/admin/catalog';

/** Отступ в выпадающем списке показывает вложенность раздела. */
const optionLabel = (section: SectionOption) => `${'— '.repeat(section.depth - 1)}${section.title}`;

function FormError({ state }: { state: CatalogFormState }) {
  return state.error ? (
    <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
      {state.error}
    </p>
  ) : null;
}

export function AddSectionForm({ sections }: { sections: SectionOption[] }) {
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    addSectionAction,
    {},
    PATH,
  );
  const parents = sections.filter((section) => section.depth < MAX_DEPTH);
  return (
    <Card as="section" aria-labelledby="add-section-title" className="grid gap-4 p-4 md:p-5">
      <h2 id="add-section-title" className="text-lg">
        Новый раздел
      </h2>
      <FormError state={state} />
      <form action={formAction} noValidate className="grid gap-4">
        <Input
          name="sectionTitle"
          label="Название раздела"
          defaultValue={state.values?.sectionTitle}
          error={state.fieldErrors?.sectionTitle}
        />
        {/* key: после ошибки React сбрасывает форму, а у списка сброс вернул бы первый пункт —
            пересоздаём список, чтобы выбранное значение сохранилось. */}
        <Select
          key={state.values?.parentId ?? ''}
          name="parentId"
          label="Где разместить"
          options={[
            { value: '', label: 'На верхнем уровне' },
            ...parents.map((section) => ({
              value: String(section.id),
              label: optionLabel(section),
            })),
          ]}
          defaultValue={state.values?.parentId ?? ''}
        />
        <div>
          <Button type="submit" disabled={pending}>
            Добавить раздел
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AddLinkForm({ sections }: { sections: SectionOption[] }) {
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    addLinkAction,
    {},
    PATH,
  );
  return (
    <Card as="section" aria-labelledby="add-link-title" className="grid gap-4 p-4 md:p-5">
      <h2 id="add-link-title" className="text-lg">
        Новая ссылка
      </h2>
      <FormError state={state} />
      <form action={formAction} noValidate className="grid gap-4">
        <Select
          key={state.values?.sectionId ?? ''}
          name="sectionId"
          label="Раздел"
          options={sections.map((section) => ({
            value: String(section.id),
            label: optionLabel(section),
          }))}
          defaultValue={state.values?.sectionId}
          error={state.fieldErrors?.sectionId}
        />
        <Input
          name="linkTitle"
          label="Название ссылки"
          defaultValue={state.values?.linkTitle}
          error={state.fieldErrors?.linkTitle}
        />
        <Input
          name="url"
          type="url"
          label="Адрес"
          placeholder="https://"
          defaultValue={state.values?.url}
          error={state.fieldErrors?.url}
        />
        <Input
          name="description"
          label="Описание"
          hint="Необязательно, до 300 символов."
          defaultValue={state.values?.description}
          error={state.fieldErrors?.description}
        />
        <div>
          <Button type="submit" disabled={pending || sections.length === 0}>
            Добавить ссылку
          </Button>
        </div>
      </form>
    </Card>
  );
}

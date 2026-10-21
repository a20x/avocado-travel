import { ActionForm } from '@/shared/ui/ActionForm';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import type { BannedHost, StopWord } from '../model';
import {
  addStopWordAction,
  banHostAction,
  removeStopWordAction,
  unbanHostAction,
} from '../server/actions';

const PATH = '/admin/guestbook/rules';

/** Запрещённые слова и хосты: добавить и удалить. */
export function AdminRules({ words, hosts }: { words: StopWord[]; hosts: BannedHost[] }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card as="section" aria-labelledby="words-title" className="grid gap-4 p-4 md:p-6">
        <h2 id="words-title" className="text-xl">
          Запрещённые слова
        </h2>
        <p className="text-sm text-slate">
          Запись со словом из списка сохраняется скрытой. Новое слово скрывает и уже опубликованные
          записи с ним, удаление слова — возвращает их.
        </p>
        <ActionForm
          action={addStopWordAction}
          permalink={PATH}
          className="flex flex-wrap items-end gap-3"
        >
          <Input name="word" label="Слово или выражение" className="min-w-0 flex-1" />
          <Button type="submit">Добавить</Button>
        </ActionForm>
        <ul className="flex flex-wrap gap-2">
          {words.map((word) => (
            <li
              key={word.id}
              className="flex items-center gap-1 rounded-full bg-mist py-1 pr-1 pl-3"
            >
              {word.word}
              <ActionForm action={removeStopWordAction} permalink={PATH}>
                <input type="hidden" name="id" value={word.id} />
                <button
                  type="submit"
                  aria-label={`Убрать слово «${word.word}»`}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-line"
                >
                  ×
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      </Card>

      <Card as="section" aria-labelledby="hosts-title" className="grid gap-4 p-4 md:p-6">
        <h2 id="hosts-title" className="text-xl">
          Запрещённые хосты
        </h2>
        <p className="text-sm text-slate">
          С этих адресов записи не принимаются. Можно указать один IP или подсеть: 203.0.113.0/24.
        </p>
        <ActionForm action={banHostAction} permalink={PATH} className="grid gap-3 sm:grid-cols-2">
          <Input name="pattern" label="IP или подсеть" />
          <Input name="comment" label="Комментарий" />
          <div className="sm:col-span-2">
            <Button type="submit">Запретить</Button>
          </div>
        </ActionForm>
        <ul className="grid gap-2">
          {hosts.map((host) => (
            <li
              key={host.id}
              className="flex items-center justify-between gap-3 border-t border-line pt-2"
            >
              <span>
                <span className="font-mono">{host.pattern}</span>
                {host.comment ? (
                  <span className="block text-sm text-slate">{host.comment}</span>
                ) : null}
              </span>
              <ActionForm action={unbanHostAction} permalink={PATH}>
                <input type="hidden" name="id" value={host.id} />
                <Button type="submit" variant="ghost">
                  Разрешить<span className="sr-only"> {host.pattern}</span>
                </Button>
              </ActionForm>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

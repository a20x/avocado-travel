import Link from 'next/link';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

/** Формы ввода в админке: добавить записи и их список. */
const FORMS = [
  {
    add: '/admin/flights/new',
    addLabel: 'Добавить рейсы',
    list: '/admin/flights',
    listLabel: 'Все рейсы — правка',
  },
  {
    add: '/admin/cities/new',
    addLabel: 'Добавить город',
    list: '/admin/cities',
    listLabel: 'Все города — правка',
  },
  {
    add: '/admin/airlines/new',
    addLabel: 'Добавить авиакомпанию',
    list: '/admin/airlines',
    listLabel: 'Все авиакомпании — правка',
  },
] as const;

/**
 * Раздел «Ввод» вкладки «БД»: прямые ссылки на формы ввода записей. Формы — в админке,
 * вводить может только администратор; остальным — пояснение и ссылка на вход.
 */
export function DbInputCard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Card as="section" aria-labelledby="input-title" className="grid gap-4 p-5 md:p-6">
      <div className="grid gap-2">
        <h2 id="input-title" className="text-2xl">
          Ввод данных
        </h2>
        <p>
          Рейсы, города и авиакомпании вводятся в формах ниже. Значения для полей выбираются из
          выпадающих списков; нужного нет — кнопка «+ Добавить» рядом со списком. Новые города,
          авиакомпании и страны сразу появляются в списках ввода и в разделе «Поиск по двум
          атрибутам». Заказы и билеты появляются, когда посетители бронируют рейсы.
        </p>
        {isAdmin ? null : (
          <p className="rounded-sm bg-mist px-4 py-3">
            Вводить данные может только администратор.{' '}
            <Link href="/login?next=%2Fdatabase%3Freport%3Dinput">Войти как администратор</Link>
          </p>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {FORMS.map((form) => (
          <li key={form.add} className="grid content-start gap-2">
            <Link href={form.add} className={buttonClasses()}>
              {form.addLabel}
            </Link>
            <Link href={form.list} className="justify-self-center">
              {form.listLabel}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

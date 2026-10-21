import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { Button, buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Skeleton, SkeletonGroup } from '@/shared/ui/Skeleton';
import { Table } from '@/shared/ui/Table';
import { Tabs } from '@/shared/ui/Tabs';
import { DialogDemo } from './DialogDemo';
import { ToastDemo } from './ToastDemo';

export const metadata: Metadata = {
  title: 'Компоненты',
  robots: { index: false },
};

const COLORS = [
  ['graphite', 'bg-graphite'],
  ['slate', 'bg-slate'],
  ['mist', 'bg-mist'],
  ['sky', 'bg-sky'],
  ['line-strong', 'bg-line-strong'],
  ['sage', 'bg-sage'],
  ['sage-light', 'bg-sage-light'],
  ['avocado', 'bg-avocado'],
  ['leaf', 'bg-leaf'],
  ['pit', 'bg-pit'],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

/** Витрина общих компонентов для разработки. На боевом сайте её нет — там 404. */
export default function UiShowcasePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl">Компоненты</h1>
      <p className="text-slate">
        Общие компоненты из <code>src/shared/ui</code>. Страница есть только в режиме разработки.
      </p>

      <Section title="Цвета">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COLORS.map(([name, bg]) => (
            <div key={name} className="overflow-hidden rounded-sm bg-white shadow-card">
              <div className={`h-14 ${bg}`} />
              <p className="px-3 py-2 text-sm">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Шрифт">
        <p className="text-4xl font-semibold">48 · Заголовок героя</p>
        <p className="text-3xl font-semibold">36 · Заголовок страницы</p>
        <p className="text-2xl font-semibold">28 · Раздел</p>
        <p className="text-xl font-semibold">22 · Подраздел</p>
        <p className="text-lg font-semibold">18 · Заголовок карточки</p>
        <p>16 · Основной текст. Цена 5 200 ₽, рейс LST 1204.</p>
        <p className="text-sm text-slate">14 · Подписи и примечания</p>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Подобрать рейсы →</Button>
          <Button variant="secondary">Изменить запрос</Button>
          <Button variant="ghost">Отмена</Button>
          <Button size="lg">Большая</Button>
          <Button disabled>Недоступна</Button>
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
            Ссылка-кнопка
          </Link>
        </div>
      </Section>

      <Section title="Метки">
        <div className="flex flex-wrap gap-2">
          <Badge>от 3 900 ₽</Badge>
          <Badge tone="accent">выгодно</Badge>
          <Badge tone="success">Оплачен</Badge>
          <Badge tone="warning">Ожидает оплаты</Badge>
          <Badge tone="muted">Отменён</Badge>
          <Badge tone="error">Ошибка оплаты</Badge>
        </div>
      </Section>

      <Section title="Поля формы">
        <Card className="grid gap-5 p-6 md:grid-cols-2">
          <Input name="name" label="Имя" placeholder="Анна" />
          <Input name="email" type="email" label="Почта" hint="На неё придёт код брони" />
          <Input
            name="passport"
            label="Номер паспорта"
            error="Нужно 10 цифр"
            defaultValue="45 12"
          />
          <Select
            name="class"
            label="Класс"
            options={[
              { value: 'economy', label: 'Эконом' },
              { value: 'business', label: 'Бизнес' },
            ]}
          />
        </Card>
      </Section>

      <Section title="Дата">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <DatePicker
            name="demo-date"
            label="Дата вылета"
            defaultValue="2026-11-14"
            min="2026-10-21"
            max="2026-12-20"
            hint="От сегодня до 60 дней вперёд"
          />
          <p className="text-xl">
            Внутри фразы:{' '}
            <DatePicker
              variant="inline"
              name="demo-date-inline"
              label="Дата вылета"
              defaultValue="2026-11-14"
            />
          </p>
        </div>
      </Section>

      <Section title="Загрузка">
        <Card className="max-w-xl p-5">
          <SkeletonGroup label="Загрузка примера">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-2/3" />
          </SkeletonGroup>
        </Card>
      </Section>

      <Section title="Уведомление и окно">
        <div className="flex flex-wrap gap-3">
          <ToastDemo />
          <DialogDemo />
        </div>
      </Section>

      <Section title="Вкладки">
        <Tabs
          label="Разделы кабинета"
          current="/dev/ui"
          items={[
            { href: '/dev/ui', label: 'Мои заказы' },
            { href: '/dev/ui?tab=profile', label: 'Профиль' },
          ]}
        />
      </Section>

      <Section title="Карточка">
        <Card as="article" className="p-6">
          <h3 className="text-lg">Москва → Калининград</h3>
          <p className="text-slate">14 ноября, 08:40 · LST 1204 · 2 пассажира</p>
        </Card>
      </Section>

      <Section title="Таблица">
        <Table caption="Флот авиакомпаний">
          <thead>
            <tr>
              <th scope="col">Авиакомпания</th>
              <th scope="col">Самолёты</th>
              <th scope="col">Рейсов в день</th>
              <th scope="col">Багаж в эконом</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ластавиа</td>
              <td>Airbus A320neo, A321neo</td>
              <td>42</td>
              <td>Нет</td>
            </tr>
            <tr>
              <td>Кирра</td>
              <td>Boeing 737-800</td>
              <td>28</td>
              <td>23 кг</td>
            </tr>
          </tbody>
        </Table>
      </Section>

      <Section title="Пустое состояние">
        <Card>
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="Рейсов не нашлось"
            text="Попробуйте другую дату или соседний аэропорт."
            action={<Button variant="secondary">Изменить запрос</Button>}
          />
        </Card>
      </Section>
    </div>
  );
}

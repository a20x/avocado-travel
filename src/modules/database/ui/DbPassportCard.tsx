import Link from 'next/link';
import { Card } from '@/shared/ui/Card';
import { formatBytes, share, type DbPassport } from '../model';

const number = new Intl.NumberFormat('ru-RU');
const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});
const date = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
});

const msk = (value: Date | null) => (value ? `${dateTime.format(value)} МСК` : '—');

/**
 * Паспорт базы (раздел «О базе данных»): что в ней хранится, сколько, насколько полно
 * и насколько свежо. Цифры читаются из базы при открытии страницы.
 */
export function DbPassportCard({ passport }: { passport: DbPassport }) {
  const { counts } = passport;
  const stats = [
    ['Рейсов', counts.flights],
    ['Заказов', counts.orders],
    ['Билетов', counts.tickets],
    ['Объём базы', formatBytes(passport.sizeBytes)],
  ] as const;

  return (
    <Card
      as="section"
      id="about"
      aria-labelledby="about-title"
      className="grid scroll-mt-4 gap-5 p-5 md:p-6"
    >
      <div className="grid gap-2">
        <h2 id="about-title" className="text-2xl">
          О базе данных Avocado Travel
        </h2>
        <p>
          База сайта продажи авиабилетов: расписание рейсов, заказы и билеты, справочники
          аэропортов, авиакомпаний и самолётов, а также новости, форум, оценки и статистика
          посещений. Данные хранятся на сервере в PostgreSQL; авиакомпании выдуманные, продажи
          демонстрационные.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="grid gap-1">
            <dt className="text-sm text-slate">{label}</dt>
            <dd className="text-2xl font-semibold text-leaf tabular-nums">
              {typeof value === 'number' ? number.format(value) : value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3">
        <p>
          <strong>Состав:</strong> {passport.tables} таблиц. Рейс — номер, авиакомпания, модель
          самолёта, аэропорты вылета и прилёта, время и цены эконома и бизнеса. Заказ — код брони,
          статус, сумма и время оформления, оплаты или отмены; билет — рейс, класс, место, пассажир
          и цена. Справочники: {number.format(counts.airports)} аэропортов,{' '}
          {number.format(counts.airlines)} авиакомпаний. Ещё в базе {number.format(counts.news)}{' '}
          новостей, {number.format(counts.forumTopics)} тем форума, {number.format(counts.ratings)}{' '}
          оценок сайта и {number.format(counts.pageViews)} просмотров страниц. Объём относится ко
          всей базе.
        </p>
        <p>
          <strong>Полнота:</strong> обязательные поля и связи заданы в самой базе (NOT NULL, внешние
          ключи, проверки CHECK) — пустых значений там нет. Билеты есть у{' '}
          {number.format(passport.ordersWithTickets)} из {number.format(counts.orders)} заказов (
          {share(passport.ordersWithTickets, counts.orders).toLocaleString('ru-RU')}%), дата оплаты
          — у {number.format(passport.paidWithDate)} из {number.format(passport.paidOrders)}{' '}
          оплаченных.
        </p>
        <p>
          <strong>Актуальность:</strong> последний заказ — {msk(passport.lastOrderAt)}, последняя
          новость сайта — {msk(passport.lastNewsAt)}. Расписание — с{' '}
          {passport.scheduleFrom ? date.format(passport.scheduleFrom) : '—'} по{' '}
          {passport.scheduleTo ? date.format(passport.scheduleTo) : '—'}; цифры и результаты
          запросов читаются из базы при открытии страницы.
        </p>
        <p>
          <strong>Автор базы и проекта:</strong> Ермаков Александр, Биз-Б23.{' '}
          <Link href="/admin">Ввод данных → Админка</Link> (новости, каталог ссылок, реклама — после
          входа администратора); заказы и билеты появляются, когда посетители бронируют рейсы.
        </p>
      </div>
    </Card>
  );
}

import { PASSENGER_GROUPS, PASSENGER_PAGES, groupPassengerPages } from '@/modules/passengers';
import { PassengerDisclaimer, PassengerIndex } from '@/modules/passengers/ui';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Пассажирам',
  description:
    'Правила и советы для пассажиров Avocado Travel: покупка и возврат билетов, багаж и ручная кладь, дети и животные, регистрация, полёт и что делать, если что-то пошло не так.',
  path: '/passengers',
  keywords: ['правила перевозки', 'багаж', 'ручная кладь', 'возврат билета', 'регистрация на рейс'],
});

export default function PassengersPage() {
  return (
    <div className="container-site grid gap-8 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Пассажирам</h1>
        <p className="text-lg text-slate">
          Всё, что стоит знать до поездки и в дороге: как купить и вернуть билет, сколько вещей
          можно взять, как пройти аэропорт и что делать, если рейс задержали.
        </p>
      </header>
      <PassengerIndex groups={groupPassengerPages(PASSENGER_GROUPS, PASSENGER_PAGES)} />
      <PassengerDisclaimer />
    </div>
  );
}

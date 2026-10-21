import { guestbookBannedHosts, guestbookEntries, guestbookStopWords } from '@/modules/guestbook';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import type { Db } from './db';

// 15 записей и 5 запрещённых слов (docs/04-data-model.md, «Демо-данные»).
// IP — из диапазонов для документации (RFC 5737): настоящим людям они не принадлежат.
const STOP_WORDS = ['казино', 'ставки на спорт', 'дурак', 'идиот', 'спам'];

type DemoEntry = {
  authorName: string;
  message: string;
  daysAgo: number;
  time: string;
  ip: string;
  hidden?: 'stop_word' | 'admin';
};

// prettier-ignore
const ENTRIES: DemoEntry[] = [
  { authorName: 'Марина', message: 'Нашла билеты в Калининград за пару минут. Поиск фразой — очень удобно!', daysAgo: 58, time: '10:12', ip: '198.51.100.11' },
  { authorName: 'Игорь', message: 'Схема салона понравилась: сразу видно, где места с запасом для ног.', daysAgo: 54, time: '19:40', ip: '198.51.100.23' },
  { authorName: 'Ольга П.', message: 'Летали всей семьёй в Сочи, места выбрали рядом. Спасибо!', daysAgo: 49, time: '08:05', ip: '198.51.100.37' },
  { authorName: 'Денис', message: 'Хотелось бы видеть и обратные рейсы в одном поиске.\nНо и так неплохо.', daysAgo: 45, time: '22:31', ip: '198.51.100.41' },
  { authorName: 'Гость', message: 'Лучшее онлайн-казино, заходите по ссылке!', daysAgo: 41, time: '03:14', ip: '203.0.113.66', hidden: 'stop_word' },
  { authorName: 'Анастасия', message: 'Отменила бронь в кабинете — места сразу освободились. Всё понятно.', daysAgo: 37, time: '14:20', ip: '198.51.100.52' },
  { authorName: 'Сергей Н.', message: 'Фильтр по багажу — то, что нужно. Летаю только с чемоданом.', daysAgo: 33, time: '11:48', ip: '198.51.100.60' },
  { authorName: 'Павел', message: 'Сайт работает быстро даже на телефоне.', daysAgo: 28, time: '17:02', ip: '198.51.100.71' },
  { authorName: 'Аноним', message: 'Кто придумал этот сайт — дурак.', daysAgo: 24, time: '01:50', ip: '198.51.100.88', hidden: 'stop_word' },
  { authorName: 'Елена', message: 'Альтэйрой во Владивосток — долго, но комфортно. Время прилёта показано по местному, это удобно.', daysAgo: 20, time: '09:30', ip: '198.51.100.93' },
  { authorName: 'Рекламщик', message: 'Продвижение сайтов недорого, пишите в личку.', daysAgo: 16, time: '12:00', ip: '198.51.100.99', hidden: 'admin' },
  { authorName: 'Тимур', message: 'Добавьте, пожалуйста, рейсы в Мурманск!', daysAgo: 12, time: '20:15', ip: '198.51.100.104' },
  { authorName: 'Кристина', message: 'Оплата демонстрационная, но выглядит как настоящая. Интересный проект.', daysAgo: 8, time: '15:45', ip: '198.51.100.115' },
  { authorName: 'Виктор', message: 'Удобно, что код брони без похожих букв и цифр — не перепутаешь.', daysAgo: 4, time: '18:22', ip: '198.51.100.120' },
  { authorName: 'Юлия', message: 'Спасибо за новости про новые направления, слежу за лентой.', daysAgo: 1, time: '13:10', ip: '198.51.100.131' },
];

export async function seedGuestbook(db: Db, today: string): Promise<number> {
  await db.insert(guestbookStopWords).values(STOP_WORDS.map((word) => ({ word })));
  await db
    .insert(guestbookBannedHosts)
    .values({ pattern: '203.0.113.0/24', comment: 'Рассылка рекламы казино (пример)' });
  await db.insert(guestbookEntries).values(
    ENTRIES.map(({ daysAgo, time, hidden, ...entry }) => ({
      ...entry,
      userAgent: 'Mozilla/5.0 (демо-данные)',
      isVisible: !hidden,
      hiddenReason: hidden ?? null,
      createdAt: zonedTimeToUtc(addDays(today, -daysAgo), time, 'Europe/Moscow'),
    })),
  );
  return ENTRIES.length;
}

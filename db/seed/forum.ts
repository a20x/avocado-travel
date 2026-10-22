import { inArray } from 'drizzle-orm';
import { users } from '@/modules/auth';
import { forumPosts, forumTopics } from '@/modules/forum';
import { env } from '@/server/env';
import { addDays, zonedTimeToUtc } from '@/shared/lib/time';
import type { Db } from './db';

// 5 тем и 30 сообщений (docs/04-data-model.md, «Демо-данные»).
// Авторы — демо-пользователи без пароля: войти под ними нельзя, они только подписывают сообщения.
const AUTHORS = {
  marina: 'Марина К.',
  igor: 'Игорь',
  olga: 'Ольга П.',
  denis: 'Денис',
  timur: 'Тимур',
  kristina: 'Кристина',
} as const;

type Author = keyof typeof AUTHORS | 'admin';

type DemoPost = { author: Author; daysAgo: number; time: string; body: string };
type DemoTopic = { title: string; posts: DemoPost[] };

const emailOf = (author: keyof typeof AUTHORS) => `forum-${author}@demo.avocado.local`;

// prettier-ignore
const TOPICS: DemoTopic[] = [
  {
    title: 'Правила форума',
    posts: [
      { author: 'admin', daysAgo: 60, time: '10:00', body: 'Добро пожаловать на форум Avocado Travel!\n\nПишите по делу, уважайте собеседников, не публикуйте рекламу и личные данные — ни свои, ни чужие. Сообщения с нарушениями удаляются.\nСвоё сообщение можно изменить в первые 15 минут после публикации.' },
      { author: 'marina', daysAgo: 59, time: '12:30', body: 'Спасибо, всё понятно. Хорошо, что можно поправить опечатку.' },
    ],
  },
  {
    title: 'Какое место выбрать в самолёте?',
    posts: [
      { author: 'igor', daysAgo: 30, time: '09:15', body: 'Лечу первый раз один и не понимаю, что выбрать: у окна или у прохода. Что посоветуете?' },
      { author: 'olga', daysAgo: 30, time: '10:02', body: 'Если рейс короткий — у окна, смотреть на облака. Если больше трёх часов — у прохода, чтобы вставать, никого не тревожа.' },
      { author: 'denis', daysAgo: 30, time: '11:40', body: 'Я всегда беру ряд у аварийного выхода — там больше места для ног. На схеме салона такие ряды выделены отдельно.' },
      { author: 'igor', daysAgo: 30, time: '12:05', body: 'А за них доплачивать?' },
      { author: 'denis', daysAgo: 30, time: '12:20', body: 'Да, немного. Сумма сразу видна, когда выбираешь место.' },
      { author: 'kristina', daysAgo: 29, time: '08:45', body: 'Ещё совет: не садитесь в последний ряд. Спинки там часто не откидываются, и рядом туалеты.' },
      { author: 'marina', daysAgo: 29, time: '13:10', body: 'С ребёнком мы садимся ближе к началу салона — меньше трясёт и быстрее выходить.' },
      { author: 'timur', daysAgo: 28, time: '19:30', body: 'В широкофюзеляжных самолётах середина ряда — самое неудобное место. Лучше заранее выбрать что угодно, кроме неё.' },
      { author: 'igor', daysAgo: 28, time: '20:00', body: 'Выбрал место у окна в начале салона. Всем спасибо!' },
      { author: 'olga', daysAgo: 27, time: '09:00', body: 'Удачного полёта! Возьмите с собой воду и что-нибудь почитать.' },
      { author: 'kristina', daysAgo: 20, time: '17:25', body: 'Игорь, как слетали?' },
      { author: 'igor', daysAgo: 19, time: '21:10', body: 'Отлично! Вид из окна на посадке был потрясающий. В следующий раз попробую ряд у выхода.' },
    ],
  },
  {
    title: 'Калининград в ноябре: что посмотреть?',
    posts: [
      { author: 'kristina', daysAgo: 14, time: '18:00', body: 'Собираемся на четыре дня в середине ноября. Что стоит посмотреть, если погода будет так себе?' },
      { author: 'marina', daysAgo: 14, time: '19:20', body: 'Обязательно Музей Мирового океана — там можно провести полдня. И Кафедральный собор на острове Канта.' },
      { author: 'timur', daysAgo: 13, time: '08:30', body: 'Съездите на день в Светлогорск: зимнее море очень красивое, даже в дождь.' },
      { author: 'olga', daysAgo: 13, time: '12:45', body: 'Куршская коса в ноябре пустая и тихая. Возьмите непромокаемую обувь.' },
      { author: 'kristina', daysAgo: 12, time: '22:15', body: 'Записала всё, спасибо! Билеты уже взяли.' },
      { author: 'denis', daysAgo: 10, time: '10:10', body: 'И не забудьте про местное время — оно на час отличается от московского.' },
      { author: 'kristina', daysAgo: 10, time: '11:00', body: 'Точно, в билете время прилёта как раз указано местное.' },
    ],
  },
  {
    title: 'Сколько багажа берёте в короткие поездки?',
    posts: [
      { author: 'denis', daysAgo: 9, time: '14:00', body: 'Лечу на выходные и думаю, брать ли тариф с багажом. Кто как обходится одной ручной кладью?' },
      { author: 'olga', daysAgo: 9, time: '15:30', body: 'На два-три дня — только рюкзак. Главное заранее проверить размеры ручной клади у авиакомпании.' },
      { author: 'igor', daysAgo: 8, time: '09:40', body: 'Я фильтрую рейсы по багажу прямо в поиске — сразу видно, где он включён.' },
      { author: 'timur', daysAgo: 7, time: '20:20', body: 'Зимой без багажа сложно: куртка и обувь занимают половину рюкзака.' },
      { author: 'denis', daysAgo: 7, time: '21:05', body: 'Убедили, возьму с багажом: обратно точно повезу подарки.' },
    ],
  },
  {
    title: 'Ереван или Ташкент на выходные?',
    posts: [
      { author: 'timur', daysAgo: 4, time: '11:30', body: 'Есть три свободных дня в конце месяца. Куда лучше: Ереван или Ташкент? Хочется вкусно поесть и погулять по городу.' },
      { author: 'marina', daysAgo: 3, time: '16:40', body: 'Ереван — компактный, всё можно обойти пешком, а вечером подняться на Каскад. Для трёх дней идеально.' },
      { author: 'kristina', daysAgo: 2, time: '10:15', body: 'Ташкент — плов, базар Чорсу и метро, каждая станция как музей. Но перелёт подольше.' },
      { author: 'timur', daysAgo: 1, time: '19:50', body: 'Похоже, начну с Еревана, а Ташкент оставлю на отпуск. Спасибо!' },
    ],
  },
];

/** Демо-авторы: создаются один раз, при повторном запуске остаются как есть. */
async function ensureAuthors(db: Db): Promise<Record<Author, string>> {
  const emails = Object.keys(AUTHORS).map((key) => emailOf(key as keyof typeof AUTHORS));
  await db
    .insert(users)
    .values(
      Object.entries(AUTHORS).map(([key, name]) => ({
        id: crypto.randomUUID(),
        name,
        email: emailOf(key as keyof typeof AUTHORS),
        emailVerified: true,
      })),
    )
    .onConflictDoNothing({ target: users.email });

  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, [...emails, env.ADMIN_EMAIL.toLowerCase()]));
  const idByEmail = new Map(rows.map((row) => [row.email, row.id]));
  const idOf = (email: string) => {
    const id = idByEmail.get(email);
    if (!id) throw new Error(`Нет пользователя ${email}`);
    return id;
  };

  return {
    admin: idOf(env.ADMIN_EMAIL.toLowerCase()),
    ...(Object.fromEntries(
      Object.keys(AUTHORS).map((key) => [key, idOf(emailOf(key as keyof typeof AUTHORS))]),
    ) as Record<keyof typeof AUTHORS, string>),
  };
}

/** Администратор уже создан (seedAdmin) — он автор темы с правилами. */
export async function seedForum(db: Db, today: string): Promise<{ topics: number; posts: number }> {
  const authorIds = await ensureAuthors(db);
  const at = (post: DemoPost) =>
    zonedTimeToUtc(addDays(today, -post.daysAgo), post.time, 'Europe/Moscow');

  for (const topic of TOPICS) {
    const [first] = topic.posts;
    const last = topic.posts.at(-1);
    if (!first || !last) continue;
    const [created] = await db
      .insert(forumTopics)
      .values({
        title: topic.title,
        authorId: authorIds[first.author],
        createdAt: at(first),
        lastPostAt: at(last),
        postsCount: topic.posts.length,
      })
      .returning({ id: forumTopics.id });
    if (!created) throw new Error('Тема не создана');
    await db.insert(forumPosts).values(
      topic.posts.map((post) => ({
        topicId: created.id,
        authorId: authorIds[post.author],
        body: post.body,
        createdAt: at(post),
      })),
    );
  }

  return { topics: TOPICS.length, posts: TOPICS.reduce((sum, t) => sum + t.posts.length, 0) };
}

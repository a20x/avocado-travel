import { expect, test } from '@playwright/test';
import { ADMIN, expectValidHtml, registerCustomer, signIn } from './helpers';

const TOPIC_URL = /\/forum\/[0-9a-f-]{36}/;

test('гость читает форум, а писать предлагают после входа', async ({ page }) => {
  await page.goto('/forum');
  await page.getByRole('link', { name: 'Какое место выбрать в самолёте?' }).click();
  await expect(page).toHaveURL(TOPIC_URL);
  const topicPath = new URL(page.url()).pathname;

  // 12 сообщений по 10 на страницу — две страницы.
  await expect(page.getByText('12 сообщений')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(10);
  await page.getByRole('link', { name: 'Страница 2' }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expectValidHtml(page, `${topicPath}?page=2`);

  // Ни правки, ни удаления у гостя нет; ответ — после входа с возвратом в тему.
  await expect(page.getByRole('link', { name: /^Изменить/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Удалить' })).toHaveCount(0);
  await page.getByRole('main').getByRole('link', { name: 'Войти' }).click();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(`${topicPath}?page=2`)}`);

  await page.goto('/forum');
  await page.getByRole('link', { name: 'Новая тема' }).click();
  await expect(page).toHaveURL('/login?next=%2Fforum%2Fnew');
});

test('покупатель создаёт тему, отвечает и правит ответ, админ удаляет', async ({
  page,
}, testInfo) => {
  const id = `${testInfo.project.name === 'mobile' ? 'm' : 'd'}${Date.now().toString(36)}`;
  const title = `Проверка форума ${id}`;
  await registerCustomer(page, 'Вера', `vera-${testInfo.project.name}`);

  // Пустая форма — ошибки у полей.
  await page.goto('/forum');
  await page.getByRole('link', { name: 'Новая тема' }).click();
  await expect(page).toHaveURL('/forum/new');
  await expectValidHtml(page, '/forum/new');
  await page.getByRole('button', { name: 'Создать тему' }).click();
  await expect(page.getByText('Заголовок — от 5 символов')).toBeVisible();
  await expect(page.getByText('Напишите сообщение')).toBeVisible();

  await page.getByLabel('Заголовок').fill(title);
  await page.getByLabel('Сообщение').fill(`Первое сообщение ${id}`);
  await page.getByRole('button', { name: 'Создать тему' }).click();
  await expect(page).toHaveURL(TOPIC_URL);
  const topicPath = new URL(page.url()).pathname;
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

  // Ответ — страница прокручивается к новому сообщению.
  await page.getByLabel('Сообщение').fill(`Ответ ${id}`);
  await page.getByRole('button', { name: 'Ответить' }).click();
  await expect(page).toHaveURL(/#post-/);
  const reply = page.getByRole('article').filter({ hasText: `Ответ ${id}` });
  await expect(reply).toBeVisible();
  await expectValidHtml(page, topicPath);

  // Своё сообщение можно изменить в первые 15 минут.
  await reply.getByRole('link', { name: /^Изменить/ }).click();
  await page.getByLabel('Текст сообщения').fill(`Исправленный ответ ${id}`);
  await page.getByRole('button', { name: 'Сохранить' }).click();
  const edited = page.getByRole('article').filter({ hasText: `Исправленный ответ ${id}` });
  await expect(edited.getByText('изменено')).toBeVisible();
  await expect(page.getByText('2 сообщения')).toBeVisible();

  // Администратор удаляет ответ, затем всю тему.
  await page.context().clearCookies();
  await page.goto(`/login?next=${encodeURIComponent(topicPath)}`);
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(topicPath);
  await edited.getByRole('button', { name: 'Удалить' }).click();
  await page
    .getByRole('dialog', { name: 'Удалить сообщение?' })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await expect(edited).toHaveCount(0);
  await expect(page.getByText('1 сообщение', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Удалить тему' }).click();
  await page
    .getByRole('dialog', { name: 'Удалить тему?' })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await expect(page).toHaveURL('/forum?deleted=1');
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);
});

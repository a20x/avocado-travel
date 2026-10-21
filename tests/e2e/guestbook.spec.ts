import { expect, test, type Page } from '@playwright/test';
import { expectValidHtml, openAsAdmin } from './helpers';

/** Метка, уникальная для прогона и экрана: тесты идут параллельно на одной базе. */
const tag = (projectName: string) =>
  `${projectName === 'mobile' ? 'm' : 'd'}${Date.now().toString(36)}`;

async function post(page: Page, authorName: string, message: string) {
  await page.goto('/guestbook');
  await page.getByLabel('Ваше имя').fill(authorName);
  await page.getByLabel('Сообщение').fill(message);
  await page.getByRole('button', { name: 'Отправить' }).click();
}

const entries = (page: Page) => page.getByRole('region', { name: 'Записи посетителей' });

test('посетитель оставляет запись, грубая уходит на проверку', async ({ page }, testInfo) => {
  const id = tag(testInfo.project.name);

  // Пустая форма — ошибки у полей.
  await page.goto('/guestbook');
  await page.getByRole('button', { name: 'Отправить' }).click();
  await expect(page.getByText('Представьтесь')).toBeVisible();

  await post(page, `Ира ${id}`, `Отличный сайт! ${id}`);
  await expect(page.getByRole('status').filter({ hasText: 'Запись опубликована' })).toBeVisible();
  await expect(entries(page).getByText(`Отличный сайт! ${id}`)).toBeVisible();

  // «Спам» — в списке запрещённых слов демо-данных: запись сохраняется, но не видна.
  await post(page, `Ира ${id}`, `Это спам ${id}`);
  await expect(page.getByRole('status').filter({ hasText: 'после проверки' })).toBeVisible();
  await expect(entries(page).getByText(`Это спам ${id}`)).toHaveCount(0);
});

test('с запрещённой подсети запись не принимается', async ({ page }, testInfo) => {
  // 203.0.113.0/24 запрещена в демо-данных. Прокси хостинга дописывает адрес в конец заголовка.
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': '203.0.113.5' });
  await post(page, 'Спамер', `Привет ${tag(testInfo.project.name)}`);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'С вашего адреса оставлять записи в гостевой книге нельзя.',
  );
  // Введённое не пропало.
  await expect(page.getByLabel('Ваше имя')).toHaveValue('Спамер');
});

test('администратор модерирует записи и ведёт списки запретов', async ({ page }, testInfo) => {
  const id = tag(testInfo.project.name);
  const message = `Запись для модерации ${id}`;
  await post(page, `Модерация ${id}`, message);
  await expect(entries(page).getByText(message)).toBeVisible();

  await openAsAdmin(page, '/admin/guestbook');
  await expectValidHtml(page, '/admin/guestbook');
  const row = page.getByRole('row').filter({ hasText: message });

  // Скрыть — запись пропадает у посетителей; показать — возвращается.
  await row.getByRole('button', { name: /^Скрыть/ }).click();
  await expect(row.getByText('скрыта админом')).toBeVisible();
  await page.goto('/guestbook');
  await expect(entries(page).getByText(message)).toHaveCount(0);
  await page.goto('/admin/guestbook');
  await row.getByRole('button', { name: /^Показать/ }).click();
  await expect(row.getByText('видна')).toBeVisible();

  // Новое запрещённое слово скрывает и уже опубликованную запись, удаление слова — возвращает.
  await page
    .getByRole('navigation', { name: 'Разделы гостевой книги' })
    .getByRole('link', { name: 'Запреты' })
    .click();
  await expectValidHtml(page, '/admin/guestbook/rules');
  await page.getByLabel('Слово или выражение').fill(id);
  await page.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByRole('button', { name: `Убрать слово «${id}»` })).toBeVisible();
  await page.goto('/guestbook');
  await expect(entries(page).getByText(message)).toHaveCount(0);
  await page.goto('/admin/guestbook/rules');
  await page.getByRole('button', { name: `Убрать слово «${id}»` }).click();
  await expect(page.getByRole('button', { name: `Убрать слово «${id}»` })).toHaveCount(0);
  await page.goto('/guestbook');
  await expect(entries(page).getByText(message)).toBeVisible();

  // Запретить и снова разрешить подсеть; неверный адрес — понятная ошибка.
  await page.goto('/admin/guestbook/rules');
  await page.getByLabel('IP или подсеть').fill('example.com');
  await page.getByRole('button', { name: 'Запретить' }).click();
  await expect(page.getByText('Нужен IP-адрес или подсеть')).toBeVisible();
  const subnet = testInfo.project.name === 'mobile' ? '198.18.1.0/24' : '198.18.2.0/24';
  await page.getByLabel('IP или подсеть').fill(subnet);
  await page.getByLabel('Комментарий').fill(`Проверка ${id}`);
  await page.getByRole('button', { name: 'Запретить' }).click();
  const unban = page.getByRole('button', { name: `Разрешить ${subnet}` });
  await expect(unban).toBeVisible();
  await unban.click();
  await expect(unban).toHaveCount(0);

  // Удаление — с подтверждением.
  await page.goto('/admin/guestbook');
  await row.getByRole('button', { name: 'Удалить' }).click();
  await page
    .getByRole('dialog', { name: 'Удалить запись?' })
    .getByRole('button', { name: 'Удалить' })
    .click();
  await expect(page).toHaveURL('/admin/guestbook?deleted=1');
  await expect(page.getByRole('row').filter({ hasText: message })).toHaveCount(0);
});

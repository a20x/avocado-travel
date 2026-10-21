import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectValidHtml,
  fillRegistration,
  registerCustomer,
  signIn,
  uniqueEmail,
} from './helpers';

/** В шапке видна кнопка входа или раздела пользователя (на телефоне — внутри меню). */
async function expectAccountButton(page: Page, name: string) {
  const header = page.getByRole('banner');
  const menu = header.locator('summary[aria-label="Меню"]');
  const isMobile = await menu.isVisible();
  if (isMobile) await menu.click();
  await expect(
    header.getByRole('link', { name, exact: true }).locator('visible=true'),
  ).toBeVisible();
  // Открытое меню закрывает страницу — сворачиваем обратно.
  if (isMobile) await menu.click();
}

test('регистрация, кабинет и выход', async ({ page }, testInfo) => {
  const email = uniqueEmail(`anna-${testInfo.project.name}`);

  await page.goto('/register');
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill('short');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page.getByText('Пароль — от 8 символов')).toBeVisible();
  // Введённое не пропадает после ошибки.
  await expect(page.getByLabel('Почта')).toHaveValue(email);

  await fillRegistration(page, 'Анна', email);
  await expect(page).toHaveURL('/account');
  await expect(page.getByText(`Анна · ${email}`)).toBeVisible();
  await expectAccountButton(page, 'Кабинет');
  await expectValidHtml(page, '/account');

  await page.getByRole('main').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('/');
  await expectAccountButton(page, 'Войти');

  // Та же почта второй раз — понятная ошибка.
  await page.goto('/register');
  await fillRegistration(page, 'Анна', email);
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'С этой почтой уже есть аккаунт',
  );
});

test('кабинет без входа ведёт на вход и возвращает обратно', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL('/login?next=%2Faccount');

  await signIn(page, ADMIN.email, 'wrong-password');
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Неверная почта или пароль.');

  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL('/account');
});

test('админка открывается администратору и скрыта от покупателя', async ({ page }, testInfo) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/login?next=%2Fadmin');
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Админка' })).toBeVisible();
  await expectValidHtml(page, '/admin');
  await page.getByRole('main').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('/');

  // Покупатель на /admin получает 404, как будто раздела нет.
  await registerCustomer(page, 'Борис', `boris-${testInfo.project.name}`);
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(404);
});

import { expect, test, type Page } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';

const htmlValidate = new HtmlValidate({
  extends: ['html-validate:standard', 'html-validate:a11y'],
});

/** Закрытые страницы не входят в общий список: HTML проверяем с cookie вошедшего пользователя. */
async function expectValidHtml(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.status()).toBe(200);
  const report = await htmlValidate.validateString(await response.text());
  expect(report.valid, formatterFactory('stylish')(report.results)).toBe(true);
}

// Те же значения, что в .env.example и CI; скрипт демо-данных создаёт этого администратора.
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@avocado.local',
  password: process.env.ADMIN_PASSWORD ?? 'avocado-admin',
};

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
}

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
  const email = `anna-${testInfo.project.name}-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill('short');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page.getByText('Пароль — от 8 символов')).toBeVisible();
  // Введённое не пропадает после ошибки.
  await expect(page.getByLabel('Почта')).toHaveValue(email);

  await page.getByLabel('Пароль').fill('anna-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page).toHaveURL('/account');
  await expect(page.getByText(`Анна · ${email}`)).toBeVisible();
  await expectAccountButton(page, 'Кабинет');
  await expectValidHtml(page, '/account');

  await page.getByRole('main').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL('/');
  await expectAccountButton(page, 'Войти');

  // Та же почта второй раз — понятная ошибка.
  await page.goto('/register');
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill('anna-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
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
  await page.goto('/register');
  await page.getByLabel('Имя').fill('Борис');
  await page.getByLabel('Почта').fill(`boris-${testInfo.project.name}-${Date.now()}@example.com`);
  await page.getByLabel('Пароль').fill('boris-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL('/account');
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(404);
});

import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  expectValidHtml,
  fillRegistration,
  registerCustomer,
  signIn,
  uniqueEmail,
} from './helpers';

/** В шапке сразу, без открытия меню, видна кнопка входа или раздела пользователя. */
async function expectAccountButton(page: Page, name: string) {
  await expect(page.getByRole('banner').getByRole('link', { name, exact: true })).toBeVisible();
}

// Замечание преподавателя по лабе 1: на окне уже 1024 px кнопки прятались в меню.
for (const width of [320, 800, 1100, 1280]) {
  test(`вход и регистрация видны в шапке без меню при ширине ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/', '/news']) {
      await page.goto(path);
      const header = page.getByRole('banner');
      for (const [name, href] of [
        ['Войти', '/login'],
        ['Регистрация', '/register'],
      ] as const) {
        const link = header.getByRole('link', { name, exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', href);
        await expect(link).toBeInViewport({ ratio: 1 });
      }
      // Шапка не шире экрана: ничего не уехало вбок.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    }
  });
}

for (const path of ['/login', '/register']) {
  test(`переключение видимости пароля на ${path}`, async ({ page }) => {
    await page.goto(path);
    const password = page.getByLabel('Пароль', { exact: true });
    await password.fill('test-password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Показать пароль', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue('test-password');
    await page.getByRole('button', { name: 'Скрыть пароль', exact: true }).press('Enter');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('test-password');
    await expect(page).toHaveURL(path);
  });
}

test('регистрация, кабинет и выход', async ({ page }, testInfo) => {
  const email = uniqueEmail(`anna-${testInfo.project.name}`);

  await page.goto('/register');
  await page.getByLabel('Имя').fill('Анна');
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('short');
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

test('администратор после входа попадает в админку, оттуда — в кабинет и обратно', async ({
  page,
}) => {
  // Вход по кнопке «Войти» в шапке: без адреса возврата.
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL('/admin');

  const main = page.getByRole('main');
  await main.getByRole('link', { name: 'Личный кабинет' }).click();
  await expect(page).toHaveURL('/account');
  await expect(main.getByRole('heading', { level: 1, name: 'Личный кабинет' })).toBeVisible();
  await main.getByRole('link', { name: '← В админку' }).click();
  await expect(page).toHaveURL('/admin');

  // Уже вошедший администратор со страницы входа тоже уходит в админку.
  await page.goto('/login');
  await expect(page).toHaveURL('/admin');
});

test('у покупателя в кабинете нет ссылки в админку', async ({ page }, testInfo) => {
  await registerCustomer(page, 'Вера', `vera-${testInfo.project.name}`);
  await page.goto('/account');
  await expect(page.getByRole('link', { name: '← В админку' })).toHaveCount(0);
});

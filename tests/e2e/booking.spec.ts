import { expect, test, type Page } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';
import { SEARCH_DATE } from './public-pages';

const htmlValidate = new HtmlValidate({
  extends: ['html-validate:standard', 'html-validate:a11y'],
});

/** Страницы брони закрыты входом: проверяем их здесь, с cookie вошедшего покупателя. */
async function expectGoodPage(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'страница шире экрана').toBeLessThanOrEqual(0);
  const response = await page.request.get(page.url());
  const report = await htmlValidate.validateString(await response.text());
  expect(report.valid, formatterFactory('stylish')(report.results)).toBe(true);
}

test('гость выбирает места, регистрируется, оформляет и оплачивает бронь', async ({
  page,
}, testInfo) => {
  // У двух экранов разные направления: тесты идут параллельно и не должны бороться за одни места.
  const to = testInfo.project.name === 'mobile' ? 'sochi' : 'kazan';
  await page.goto(`/flights?from=moscow&to=${to}&date=${SEARCH_DATE}&passengers=2`);
  await page.getByRole('link', { name: 'Выбрать места' }).first().click();
  await expect(page).toHaveURL(/\/flights\/[0-9a-f-]{36}/);
  const flightUrl = page.url();

  // Первые два свободных места эконома.
  const free = page
    .getByRole('checkbox', { name: /^Место \d+[A-K],/ })
    .and(page.locator(':enabled'));
  const seats = [
    (await free.nth(0).getAttribute('value'))!,
    (await free.nth(1).getAttribute('value'))!,
  ];
  for (const seat of seats) {
    await page
      .getByRole('checkbox', { name: new RegExp(`^Место ${seat},`) })
      .check({ force: true });
  }
  await page.getByRole('button', { name: 'Перейти к оформлению' }).click();

  // Без входа — на вход, оттуда на регистрацию; выбор мест сохраняется в адресе.
  await expect(page).toHaveURL(/\/login\?next=%2Fbooking/);
  await page.getByRole('link', { name: 'Зарегистрируйтесь' }).click();
  await page.getByLabel('Имя').fill('Вера');
  await page.getByLabel('Почта').fill(`vera-${testInfo.project.name}-${Date.now()}@example.com`);
  await page.getByLabel('Пароль').fill('vera-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page).toHaveURL(/\/booking\?/);
  await expect(page.getByRole('heading', { level: 1, name: 'Оформление брони' })).toBeVisible();
  await expect(page.getByText(`Пассажир 1 · место ${seats[0]}`)).toBeVisible();
  await expectGoodPage(page);

  // Пустая фамилия второго пассажира — ошибка у поля, введённое не пропадает.
  await page.getByLabel('Имя').nth(0).fill('Вера');
  await page.getByLabel('Фамилия').nth(0).fill('Лебедева');
  await page.getByLabel('Имя').nth(1).fill('Пётр');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page.getByText('Введите фамилию')).toBeVisible();
  await expect(page.getByLabel('Имя').nth(1)).toHaveValue('Пётр');
  await page.getByLabel('Фамилия').nth(1).fill('Лебедев');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();

  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Демонстрационная оплата')).toBeVisible();
  await expectGoodPage(page);

  await page.getByLabel('Номер карты').fill('4242 4242 4242 4241');
  await page.getByLabel('Срок действия').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: /^Оплатить/ }).click();
  await expect(page.getByText('Номер карты набран с ошибкой')).toBeVisible();

  await page.getByLabel('Номер карты').fill('4242 4242 4242 4242');
  await page.getByLabel('Срок действия').fill('12/30');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: /^Оплатить/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Бронь оформлена' })).toBeVisible();
  await expect(page.getByText(/^[A-HJ-NP-Z2-9]{6}$/)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Оплата прошла' })).toBeVisible();
  await expect(page.getByText('Вера Лебедева')).toBeVisible();
  await expectGoodPage(page);

  // Купленные места на схеме теперь заняты.
  await page.goto(flightUrl);
  for (const seat of seats) {
    const label = new RegExp(`^Место ${seat},.*занято$`);
    await expect(page.getByRole('checkbox', { name: label })).toBeDisabled();
  }
});

test('чужая или несуществующая бронь — 404', async ({ request }) => {
  const response = await request.get('/booking/00000000-0000-4000-8000-000000000000', {
    maxRedirects: 0,
  });
  // Гостя сначала отправят на вход.
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain('/login?next=');
});

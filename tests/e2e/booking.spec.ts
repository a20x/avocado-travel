import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectValidHtml,
  freeSeats,
  openFirstFlight,
  payByCard,
  registerCustomer,
} from './helpers';
import { SEARCH_DATE } from './public-pages';

// Удачный путь брони проверяет scenario.spec.ts; здесь — ошибки оформления и вёрстка страниц брони.

test('ошибки в данных пассажиров и карты, занятые места', async ({ page }, testInfo) => {
  await registerCustomer(page, 'Дина', `dina-${testInfo.project.name}`);
  const to = testInfo.project.name === 'mobile' ? 'novosibirsk' : 'yekaterinburg';
  await page.goto(`/flights?from=moscow&to=${to}&date=${SEARCH_DATE}&passengers=2`);
  const flightId = (await openFirstFlight(page)).match(/flights\/([0-9a-f-]{36})/)![1]!;
  const seats = await freeSeats(page, 2);
  const bookingUrl = `/booking?flight=${flightId}&cabinClass=economy&seats=${seats.join('&seats=')}`;

  await page.goto(bookingUrl);
  await expectNoHorizontalScroll(page);
  await expectValidHtml(page, bookingUrl);

  // Пустая фамилия второго пассажира — ошибка у поля, введённое не пропадает.
  await page.getByLabel('Имя').nth(0).fill('Дина');
  await page.getByLabel('Фамилия').nth(0).fill('Кузнецова');
  await page.getByLabel('Имя').nth(1).fill('Лев');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page.getByText('Введите фамилию')).toBeVisible();
  await expect(page.getByLabel('Имя').nth(1)).toHaveValue('Лев');
  await page.getByLabel('Фамилия').nth(1).fill('Кузнецов');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();

  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Демонстрационная оплата')).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectValidHtml(page, new URL(page.url()).pathname);

  // Номер с опечаткой не проходит алгоритм Луна.
  await payByCard(page, '4242 4242 4242 4241');
  await expect(page.getByText('Номер карты набран с ошибкой')).toBeVisible();

  // Пока бронь не оплачена, её места держатся: второй раз их не выбрать.
  await page.goto(bookingUrl);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Выбранные места уже заняты' }),
  ).toBeVisible();
});

test('бронь без входа ведёт на вход', async ({ request }) => {
  const response = await request.get('/booking/00000000-0000-4000-8000-000000000000', {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain('/login?next=');
});

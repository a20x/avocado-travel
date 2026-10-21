import { expect, test, type Page } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';
import { SEARCH_DATE } from './public-pages';

const htmlValidate = new HtmlValidate({
  extends: ['html-validate:standard', 'html-validate:a11y'],
});

/** Регистрирует нового покупателя: каждый тест начинает с пустым кабинетом. */
async function register(page: Page, name: string, tag: string) {
  await page.goto('/register');
  await page.getByLabel('Имя').fill(name);
  await page.getByLabel('Почта').fill(`${tag}-${Date.now()}@example.com`);
  await page.getByLabel('Пароль').fill('account-password');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL('/account');
}

test('неоплаченная бронь в кабинете и её отмена с подтверждением', async ({ page }, testInfo) => {
  await register(page, 'Глеб', `gleb-${testInfo.project.name}`);
  await expect(page.getByText('Заказов пока нет')).toBeVisible();

  // Бронь на одно свободное место — сразу адресом, как после схемы салона.
  const to = testInfo.project.name === 'mobile' ? 'ufa' : 'samara';
  await page.goto(`/flights?from=moscow&to=${to}&date=${SEARCH_DATE}`);
  await page.getByRole('link', { name: 'Выбрать места' }).first().click();
  await expect(page).toHaveURL(/\/flights\/[0-9a-f-]{36}/);
  const flightId = page.url().match(/flights\/([0-9a-f-]{36})/)![1]!;
  const free = page
    .getByRole('checkbox', { name: /^Место \d+[A-K],/ })
    .and(page.locator(':enabled'));
  const seat = (await free.last().getAttribute('value'))!;
  await page.goto(`/booking?flight=${flightId}&cabinClass=economy&seats=${seat}`);
  await page.getByLabel('Имя').fill('Глеб');
  await page.getByLabel('Фамилия').fill('Орлов');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]{36}$/);

  await page.goto('/account');
  const order = page.getByRole('region', { name: /→/ });
  await expect(order.getByText('Ждёт оплаты')).toBeVisible();
  await expect(order.getByRole('link', { name: 'Оплатить' })).toBeVisible();
  await expect(order.getByText(`место ${seat}`)).toBeVisible();

  const response = await page.request.get('/account');
  const report = await htmlValidate.validateString(await response.text());
  expect(report.valid, formatterFactory('stylish')(report.results)).toBe(true);

  // Диалог можно закрыть, ничего не отменив.
  await order.getByRole('button', { name: 'Отменить бронь' }).click();
  const dialog = page.getByRole('dialog', { name: /^Отменить бронь [A-Z0-9]{6}\?$/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Не отменять' }).click();
  await expect(dialog).toBeHidden();
  await expect(order.getByText('Ждёт оплаты')).toBeVisible();

  await order.getByRole('button', { name: 'Отменить бронь' }).click();
  await dialog.getByRole('button', { name: 'Отменить бронь' }).click();

  await expect(page).toHaveURL('/account?cancelled=1');
  await expect(page.getByRole('status').filter({ hasText: 'Бронь отменена' })).toBeVisible();
  await expect(order.getByText('Отменён')).toBeVisible();
  await expect(order.getByRole('button', { name: 'Отменить бронь' })).toHaveCount(0);

  // Место снова свободно.
  await page.goto(`/flights/${flightId}`);
  await expect(
    page.getByRole('checkbox', { name: new RegExp(`^Место ${seat},.*₽$`) }),
  ).toBeEnabled();
});

test('задание автоотмены открывается только с секретом', async ({ request }) => {
  expect((await request.post('/api/cron/expire-orders')).status()).toBe(401);
  const wrong = await request.post('/api/cron/expire-orders', {
    headers: { authorization: 'Bearer wrong-secret-wrong-secret' },
  });
  expect(wrong.status()).toBe(401);

  // То же значение, что в .env.example и CI.
  const secret = process.env.CRON_SECRET ?? 'local-cron-secret-change-me';
  const ok = await request.post('/api/cron/expire-orders', {
    headers: { authorization: `Bearer ${secret}` },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ expired: expect.any(Number) });
});

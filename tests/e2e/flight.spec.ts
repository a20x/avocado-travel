import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalScroll,
  expectValidHtml,
  openFirstFlight,
  seatCheckbox,
  selectSeats,
} from './helpers';
import { SEARCH_DATE } from './public-pages';

test('из результатов открывается рейс, выбираются места и считается сумма', async ({ page }) => {
  await page.goto(`/flights?from=moscow&to=kaliningrad&date=${SEARCH_DATE}&passengers=2`);
  await openFirstFlight(page);

  await expect(page).toHaveURL(/\?passengers=2&cabinClass=economy/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Москва → Калининград');
  await expectNoHorizontalScroll(page);

  const submit = page.getByRole('button', { name: /Выберите ещё|Перейти к оформлению/ });
  await expect(submit).toBeDisabled();
  // Места бизнес-класса при эконом-билете выбрать нельзя.
  await expect(seatCheckbox(page, '1A')).toBeDisabled();

  await selectSeats(page, ['8A', '8B']);
  await expect(submit).toHaveText('Перейти к оформлению');
  await expect(submit).toBeEnabled();
  await expect(page.locator('output')).not.toHaveText('0 ₽');

  // Третье место заменяет самое раннее: пассажиров двое.
  await selectSeats(page, ['9C']);
  await expect(seatCheckbox(page, '8A')).not.toBeChecked();
});

test('страница рейса отдаёт валидный HTML, неизвестный рейс — 404', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'HTML не зависит от ширины экрана');

  await page.goto(`/flights?from=moscow&to=sochi&date=${SEARCH_DATE}`);
  const href = await page.getByRole('link', { name: 'Выбрать места' }).first().getAttribute('href');
  await expectValidHtml(request, href ?? '');

  expect((await request.get('/flights/not-a-flight')).status()).toBe(404);
  expect((await request.get('/flights/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
});

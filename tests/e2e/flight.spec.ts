import { expect, test } from '@playwright/test';
import { HtmlValidate, formatterFactory } from 'html-validate';
import { SEARCH_DATE } from './public-pages';

const htmlValidate = new HtmlValidate({
  extends: ['html-validate:standard', 'html-validate:a11y'],
});

test('из результатов открывается рейс, выбираются места и считается сумма', async ({ page }) => {
  await page.goto(`/flights?from=moscow&to=kaliningrad&date=${SEARCH_DATE}&passengers=2`);
  await page.getByRole('link', { name: 'Выбрать места' }).first().click();

  await expect(page).toHaveURL(/\/flights\/[0-9a-f-]{36}\?passengers=2&cabinClass=economy/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Москва → Калининград');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'страница шире экрана').toBeLessThanOrEqual(0);

  const submit = page.getByRole('button', { name: /Выберите ещё|Перейти к оформлению/ });
  await expect(submit).toBeDisabled();
  // Места бизнес-класса при эконом-билете выбрать нельзя.
  await expect(page.getByRole('checkbox', { name: /^Место 1A,/ })).toBeDisabled();

  await page.getByRole('checkbox', { name: /^Место 8A,/ }).check({ force: true });
  await page.getByRole('checkbox', { name: /^Место 8B,/ }).check({ force: true });
  await expect(submit).toHaveText('Перейти к оформлению');
  await expect(submit).toBeEnabled();
  await expect(page.locator('output')).not.toHaveText('0 ₽');

  // Третье место заменяет самое раннее: пассажиров двое.
  await page.getByRole('checkbox', { name: /^Место 9C,/ }).check({ force: true });
  await expect(page.getByRole('checkbox', { name: /^Место 8A,/ })).not.toBeChecked();
});

test('страница рейса отдаёт валидный HTML, неизвестный рейс — 404', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'HTML не зависит от ширины экрана');

  await page.goto(`/flights?from=moscow&to=sochi&date=${SEARCH_DATE}`);
  const href = await page.getByRole('link', { name: 'Выбрать места' }).first().getAttribute('href');
  const response = await request.get(href ?? '');
  const report = await htmlValidate.validateString(await response.text());
  expect(report.valid, formatterFactory('stylish')(report.results)).toBe(true);

  expect((await request.get('/flights/not-a-flight')).status()).toBe(404);
  expect((await request.get('/flights/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
});

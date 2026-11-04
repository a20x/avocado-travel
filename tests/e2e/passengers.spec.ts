import { expect, test } from '@playwright/test';
import { PASSENGER_DISCLAIMER, PASSENGER_PAGES } from '@/modules/passengers';

test('«Пассажирам» — в основном меню, в оглавлении все страницы раздела', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const banner = page.getByRole('banner');
  if (testInfo.project.name === 'mobile') {
    await banner.locator('summary[aria-label="Меню"]').click();
  }
  await banner.getByRole('link', { name: 'Пассажирам', exact: true }).click();
  await expect(page).toHaveURL('/passengers');
  await expect(page.getByRole('heading', { level: 1, name: 'Пассажирам' })).toBeVisible();

  const main = page.getByRole('main');
  for (const item of PASSENGER_PAGES) {
    await expect(main.getByRole('link', { name: item.title, exact: true })).toHaveAttribute(
      'href',
      `/passengers/${item.slug}`,
    );
  }
  await expect(main.getByText(PASSENGER_DISCLAIMER)).toBeVisible();
});

test('страница раздела: таблица, оглавление на якорях, «Читайте также» и пометка', async ({
  page,
}) => {
  await page.goto('/passengers/baggage');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Багаж' })).toBeVisible();
  // Иллюстрация на телефоне скрыта, поэтому ищем её по подписи, а не по роли.
  await expect(main.locator('img[alt="Чемодан на колёсах с биркой"]')).toBeAttached();
  await expect(main.getByRole('table', { name: 'Бесплатный багаж' })).toBeVisible();

  // Ссылка оглавления ведёт к разделу этой же страницы.
  await main
    .getByRole('navigation', { name: 'На этой странице' })
    .getByRole('link', { name: 'Доплаты' })
    .click();
  await expect(page).toHaveURL(/\/passengers\/baggage#extra$/);
  await expect(main.getByRole('heading', { name: 'Доплаты' })).toBeInViewport();

  await expect(main.getByText(PASSENGER_DISCLAIMER)).toBeVisible();
  await main.getByRole('link', { name: 'Ручная кладь', exact: true }).click();
  await expect(page).toHaveURL('/passengers/carry-on');
  await expect(page.getByRole('link', { name: 'Пассажирам', exact: true }).first()).toBeVisible();
});

test('неизвестная страница раздела — 404', async ({ request }) => {
  const response = await request.get('/passengers/no-such-page');
  expect(response.status()).toBe(404);
});

test('страницы раздела находятся поиском по сайту', async ({ page }) => {
  await page.goto(`/search?q=${encodeURIComponent('переноска')}`);
  await page.getByRole('link', { name: 'Перевозка животных' }).click();
  await expect(page).toHaveURL('/passengers/pets');
});

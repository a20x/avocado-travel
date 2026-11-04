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

test('карточка раздела открывается щелчком в любом её месте', async ({ page }) => {
  await page.goto('/passengers');
  const link = page.getByRole('main').getByRole('link', { name: 'Ручная кладь', exact: true });
  const card = link.locator('xpath=ancestor::li[1]');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  // Правый нижний угол карточки — не текст ссылки.
  await page.mouse.click(box.x + box.width - 8, box.y + box.height - 8);
  await expect(page).toHaveURL('/passengers/carry-on');

  // То же у «Читайте также».
  const related = page.getByRole('region', { name: 'Читайте также' }).getByRole('listitem').first();
  await related.scrollIntoViewIfNeeded();
  const relatedBox = (await related.boundingBox())!;
  await page.mouse.click(relatedBox.x + relatedBox.width - 8, relatedBox.y + relatedBox.height - 8);
  await expect(page).not.toHaveURL('/passengers/carry-on');
  await expect(page).toHaveURL(/\/passengers\/[a-z-]+$/);
});

test('«К началу страницы» прокручивает наверх, «← Все страницы» ведёт в раздел', async ({
  page,
}) => {
  await page.goto('/passengers/baggage#packing');
  const main = page.getByRole('main');
  const title = main.getByRole('heading', { level: 1, name: 'Багаж' });
  await main
    .getByRole('region', { name: 'Как упаковать' })
    .getByRole('link', { name: '↑ К началу страницы' })
    .click();
  await expect(page).toHaveURL(/#page-top$/);
  await expect(title).toBeInViewport();

  await main.getByRole('link', { name: '← Все страницы для пассажиров' }).click();
  await expect(page).toHaveURL('/passengers');
});

import { expect, test } from '@playwright/test';

test('«Новости» — только новости сайта, внешние — на вкладке «RSS»', async ({ page }) => {
  // Замечание преподавателя одногруппнику: «Новости и RSS — одно и то же? Дублирование — это
  // плохо». Внешних новостей на /news нет, ссылка ведёт к объединённым новостям.
  await page.goto('/news');
  await expect(
    page
      .getByRole('navigation', { name: 'Рубрики' })
      .getByRole('link', { name: 'Новости отрасли' }),
  ).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('link', { name: '«RSS»' })).toHaveAttribute(
    'href',
    '/rss',
  );
  // Старый адрес «Новостей отрасли» — поиск вкладки «RSS» по внешним лентам.
  await page.goto('/news?source=external');
  await expect(page).toHaveURL('/rss?view=search&source=external');
  await expect(page.getByLabel('Источник')).toHaveValue('external');
});

test('«Новости» — в меню «Ещё», в основном меню их нет рядом с «RSS»', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'основное меню видно на широком экране');
  await page.goto('/');
  const menu = page.getByRole('banner').getByRole('navigation', { name: 'Основное меню' });
  await expect(menu.getByRole('link', { name: 'RSS', exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Новости', exact: true })).toHaveCount(0);
});

test('задание импорта лент открывается только с секретом', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'не зависит от экрана');
  expect((await request.get('/api/cron/import-feeds')).status()).toBe(401);
  const wrong = await request.post('/api/cron/import-feeds', {
    headers: { Authorization: 'Bearer wrong-secret' },
  });
  expect(wrong.status()).toBe(401);
});

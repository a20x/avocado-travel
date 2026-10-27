import { expect, test } from '@playwright/test';

test('«Новости отрасли» — вкладка ленты, ссылки ведут на сайты источников', async ({ page }) => {
  await page.goto('/news');
  await page
    .getByRole('navigation', { name: 'Рубрики' })
    .getByRole('link', { name: 'Новости отрасли' })
    .click();
  await expect(page).toHaveURL('/news?source=external');
  await expect(page.getByText('Новости авиации и туризма из отраслевых изданий')).toBeVisible();

  // В CI ленты не скачиваются (тесты не зависят от чужих сайтов) — тогда раздел пуст.
  const cards = page.getByRole('article');
  if ((await cards.count()) === 0) {
    await expect(page.getByText('Новости отрасли ещё не загружены')).toBeVisible();
    return;
  }
  const link = cards.first().getByRole('link');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('href', /^https?:\/\/(?!localhost)/);
});

test('текущая вкладка видна целиком и на узком экране', async ({ page }) => {
  // Последняя вкладка полосы: на телефоне она не помещается, полоса прокручивается к ней сама.
  await page.goto('/news?source=external');
  await expect(
    page
      .getByRole('navigation', { name: 'Рубрики' })
      .getByRole('link', { name: 'Новости отрасли' }),
  ).toBeInViewport({ ratio: 0.95 }); // нижний пиксель подчёркивания полоса обрезает всегда
});

test('задание импорта лент открывается только с секретом', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'не зависит от экрана');
  expect((await request.get('/api/cron/import-feeds')).status()).toBe(401);
  const wrong = await request.post('/api/cron/import-feeds', {
    headers: { Authorization: 'Bearer wrong-secret' },
  });
  expect(wrong.status()).toBe(401);
});

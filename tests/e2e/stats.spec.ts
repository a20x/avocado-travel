import { expect, test, type Page } from '@playwright/test';
import { expectValidHtml, openAsAdmin } from './helpers';

const LABELS = ['Просмотров сегодня', 'Посетителей сегодня', 'Просмотров всего'] as const;

/** Цифра счётчика в подвале; ждёт, пока вместо прочерка придёт ответ сервера. */
async function counterValue(page: Page, label: (typeof LABELS)[number]): Promise<number> {
  // Цифры — элементы <dd> списка в том же порядке, что подписи.
  const value = page
    .getByRole('region', { name: 'Счётчик посещений' })
    .getByRole('definition')
    .nth(LABELS.indexOf(label));
  await expect(value).not.toHaveText('—');
  return Number((await value.innerText()).replace(/\D/g, ''));
}

test('счётчик в подвале считает открытые страницы', async ({ page }) => {
  await page.goto('/');
  const before = await counterValue(page, 'Просмотров сегодня');
  const total = await counterValue(page, 'Просмотров всего');
  expect(total).toBeGreaterThanOrEqual(before);
  expect(await counterValue(page, 'Посетителей сегодня')).toBeGreaterThanOrEqual(1);

  // Переход по сайту без перезагрузки — тоже просмотр. Тесты идут параллельно, поэтому «не меньше».
  await page.getByRole('contentinfo').getByRole('link', { name: 'Новости' }).click();
  await expect(page).toHaveURL('/news');
  await expect
    .poll(() => counterValue(page, 'Просмотров сегодня'))
    .toBeGreaterThanOrEqual(before + 1);
});

test('отчёт о посещениях — только администратору', async ({ page }) => {
  const response = await page.request.get('/admin/stats');
  // Гостя отправляют на вход.
  expect(response.url()).toContain('/login?next=%2Fadmin%2Fstats');

  await openAsAdmin(page, '/admin/stats');
  await expect(page.getByRole('heading', { level: 1, name: 'Статистика посещений' })).toBeVisible();
  await expectValidHtml(page, '/admin/stats');

  // Демо-данные: просмотры по разделам и переходы из поисковиков.
  const sections = page.getByRole('table', { name: 'По разделам сайта' });
  await expect(sections.getByRole('cell', { name: 'Главная', exact: true })).toBeVisible();
  const referrers = page.getByRole('table', { name: 'Источники переходов' });
  await expect(referrers.getByRole('row').filter({ hasText: 'yandex.ru' })).toContainText(
    'поисковик',
  );

  // Быстрый выбор периода: 7 дней — 7 строк по дням.
  await page
    .getByRole('navigation', { name: 'Быстрый выбор периода' })
    .getByRole('link', { name: '7 дней' })
    .click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=/);
  await expect(page.getByRole('table', { name: /^По дням/ }).locator('tbody tr')).toHaveCount(7);
});

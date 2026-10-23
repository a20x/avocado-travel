import { expect, test } from '@playwright/test';

test('аналитика: пять отчётов с графиками и данными таблицей', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { level: 1, name: 'Аналитика продаж' })).toBeVisible();
  for (const name of [
    '1. Выручка по месяцам',
    '2. Топ-10 направлений',
    '3. Заполняемость рейсов',
    '4. Структура продаж',
    '5. Продажи по маршрутам',
    'Реклама',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }

  const revenue = page.getByRole('region', { name: '1. Выручка по месяцам' });
  // График рисуется в браузере после загрузки страницы.
  await expect(revenue.locator('.recharts-line')).toBeVisible();
  await revenue.getByText('Данные таблицей').click();
  await expect(revenue.getByRole('cell', { name: 'июль 2026' })).toBeVisible();

  const top = page.getByRole('region', { name: '2. Топ-10 направлений' });
  await top.getByText('Данные таблицей').click();
  await expect(top.getByRole('row')).toHaveCount(11);
});

test('фильтры по авиакомпании и направлению попадают в адрес и сужают отчёты', async ({ page }) => {
  await page.goto('/analytics');
  await page.getByLabel('Авиакомпания').selectOption({ label: 'Кирра' });
  await page.getByLabel('Направление').selectOption({ label: 'Сочи' });
  await page.getByRole('button', { name: 'Показать' }).click();

  await expect(page).toHaveURL(/airline=KRR/);
  await expect(page).toHaveURL(/destination=sochi/);
  const routes = page.getByRole('region', { name: '5. Продажи по маршрутам' });
  const firstRoute = routes.getByRole('row').nth(1);
  await expect(firstRoute).toContainText('→ Сочи');
  await expect(routes.getByRole('row').last()).toContainText('Итого');

  await page.getByRole('link', { name: 'Сбросить' }).click();
  await expect(page).toHaveURL('/analytics');
});

test('за период без продаж — понятное сообщение', async ({ page }) => {
  // Демо-заказы оформлены до вчерашнего дня: сегодня продаж ещё нет.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
  await page.goto(`/analytics?from=${today}&to=${today}&airline=ALT&destination=kaliningrad`);
  await expect(page.getByText('За этот период продаж нет')).toBeVisible();
});

import { expect, test } from '@playwright/test';

// Сквозные тесты идут на собранной (боевой) версии — служебных страниц там быть не должно.
test('витрины компонентов /dev/ui на боевом сайте нет', async ({ request }) => {
  const response = await request.get('/dev/ui');
  expect(response.status()).toBe(404);
});

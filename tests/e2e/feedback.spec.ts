import { expect, test, type Page } from '@playwright/test';
import { expectValidHtml } from './helpers';

/**
 * Голос — один на посетителя, а посетитель узнаётся по IP. Тесты идут с одного компьютера,
 * поэтому каждый представляется своим адресом: прокси хостинга дописывает его в X-Forwarded-For.
 */
async function asNewVisitor(page: Page) {
  const n = Date.now() + Math.floor(Math.random() * 1000);
  const ip = `198.18.${Math.floor(n / 256) % 256}.${n % 256}`;
  await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': ip });
}

test('посетитель оценивает сайт один раз за день', async ({ page }) => {
  await asNewVisitor(page);
  await page.goto('/');
  const rating = page.getByRole('region', { name: 'Оцените сайт' });
  await expect(rating.getByText(/\d+ оцен(ка|ки|ок)$/)).toBeVisible();

  await rating.getByRole('button', { name: 'Оценить' }).click();
  await expect(rating.getByRole('alert')).toHaveText('Выберите оценку от 1 до 5');

  // Звёзды — визуально скрытые переключатели, поэтому щелчок с force.
  await rating.getByRole('radio', { name: '4 звезды из 5' }).check({ force: true });
  await rating.getByRole('button', { name: 'Оценить' }).click();
  await expect(rating.getByRole('status')).toHaveText('Спасибо! Ваша оценка сегодня — 4 из 5.');

  // После перезагрузки формы нет: сегодня этот посетитель уже оценивал.
  await page.reload();
  await expect(rating.getByRole('button', { name: 'Оценить' })).toHaveCount(0);
});

test('посетитель голосует в опросе и видит результаты', async ({ page }) => {
  await asNewVisitor(page);
  await page.goto('/');
  const poll = page.getByRole('region', { name: 'Опрос' });
  // До голосования результатов не видно.
  await expect(poll.getByText(/^Всего \d+/)).toHaveCount(0);

  await poll.getByRole('button', { name: 'Голосовать' }).click();
  await expect(poll.getByRole('alert')).toHaveText('Выберите вариант ответа');

  await poll.getByRole('radio', { name: 'Во Владивосток' }).check();
  await poll.getByRole('button', { name: 'Голосовать' }).click();
  await expect(poll.getByRole('listitem').filter({ hasText: 'Во Владивосток' })).toContainText(
    'ваш выбор',
  );
  await expect(poll.getByText(/^Всего \d+ голос/)).toBeVisible();
  await expect(poll.getByRole('button', { name: 'Голосовать' })).toHaveCount(0);
  await expectValidHtml(page, '/');
});

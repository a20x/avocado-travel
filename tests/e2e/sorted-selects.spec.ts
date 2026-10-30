import { expect, test, type Page } from '@playwright/test';
import { openAsAdmin } from './helpers';

// Замечание преподавателя по лабе 3: все выпадающие списки — по алфавиту. Проверяются списки
// с данными; списки порядка («Сортировка»), числа пассажиров и класса упорядочены по смыслу.

/** Общие пункты списка («Все города», «Avocado Travel») стоят сверху и в сортировку не входят. */
const COMMON_VALUES = new Set(['', 'all', 'site', 'external']);

async function expectSorted(page: Page, label: string) {
  const options = await page
    .getByLabel(label, { exact: true })
    .locator('option')
    .evaluateAll((items) =>
      items.map((item) => ({
        value: (item as HTMLOptionElement).value,
        // Счётчик в скобках — «Сервис (3)» — к названию не относится.
        label: (item.textContent ?? '').replace(/\s*\(\d+\)$/, '').trim(),
      })),
    );
  const labels = options.filter((option) => !COMMON_VALUES.has(option.value)).map((o) => o.label);
  expect(labels.length, `в списке «${label}» есть варианты`).toBeGreaterThan(1);
  expect(labels, `список «${label}» по алфавиту`).toEqual(
    [...labels].sort((a, b) => a.localeCompare(b, 'ru')),
  );
}

test('выпадающие списки сайта — по алфавиту', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'порядок не зависит от ширины экрана');

  const pages: Array<[string, string[]]> = [
    ['/database', ['Откуда', 'Куда', 'Авиакомпания']],
    ['/database?report=routes', ['Авиакомпания', 'Направление']],
    ['/analytics', ['Авиакомпания', 'Направление']],
    ['/xml', ['Категория', 'Автор']],
    ['/press', ['Категория', 'Автор']],
    ['/rss', ['Источник']],
    ['/services', ['Город вылета', 'Город прилёта']],
  ];
  for (const [path, labels] of pages) {
    await page.goto(path);
    for (const label of labels) await expectSorted(page, label);
  }
});

test('выпадающие списки админки — по алфавиту', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'порядок не зависит от ширины экрана');

  await openAsAdmin(page, '/admin');
  const pages: Array<[string, string[]]> = [
    ['/admin/news/new', ['Рубрика']],
    ['/admin/ads/new', ['Картинка', 'Где показывать']],
    ['/rss', ['Рубрика']],
    ['/admin/flights', ['Город', 'Авиакомпания']],
    ['/admin/flights/new', ['Авиакомпания', 'Самолёт', 'Откуда', 'Куда']],
  ];
  for (const [path, labels] of pages) {
    await page.goto(path);
    for (const label of labels) await expectSorted(page, label);
  }
});

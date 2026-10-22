import { describe, expect, it } from 'vitest';
import {
  hitInputSchema,
  isBot,
  isSearchEngine,
  isTrackedPath,
  normalizePath,
  parsePeriod,
  referrerHost,
  sectionOf,
} from './model';
import { visitorHash } from './server/visitor-hash';

describe('адрес просмотра', () => {
  it('без параметров, якоря и завершающей косой черты', () => {
    expect(normalizePath('/news/kazan?utm=1#top')).toBe('/news/kazan');
    expect(normalizePath('/forum/')).toBe('/forum');
    expect(normalizePath('/')).toBe('/');
    expect(hitInputSchema.parse({ path: '/flights?from=moscow' }).path).toBe('/flights');
    expect(hitInputSchema.safeParse({ path: 'https://evil.example' }).success).toBe(false);
  });

  it('раздел — первая часть адреса, корень — главная', () => {
    expect(sectionOf('/')).toBe('home');
    expect(sectionOf('/news/kazan')).toBe('news');
    expect(sectionOf('/flights?from=moscow')).toBe('flights');
    expect(sectionOf('/takoy-stranicy-net')).toBe('other');
    expect(sectionOf('/constructor')).toBe('other');
  });

  it('админка, API и страницы разработчика не считаются', () => {
    expect(isTrackedPath('/')).toBe(true);
    expect(isTrackedPath('/news')).toBe(true);
    expect(isTrackedPath('/administrator')).toBe(true);
    expect(isTrackedPath('/admin')).toBe(false);
    expect(isTrackedPath('/admin/stats')).toBe(false);
    expect(isTrackedPath('/api/stats/hit')).toBe(false);
    expect(isTrackedPath('/dev/ui')).toBe(false);
  });
});

describe('источник перехода', () => {
  it('хост внешнего сайта без www', () => {
    expect(referrerHost('https://www.yandex.ru/search/?text=билеты', 'avocado.travel')).toBe(
      'yandex.ru',
    );
  });

  it('переход внутри сайта, пустой и странный адрес — без источника', () => {
    expect(referrerHost('http://localhost:3000/news', 'localhost:3000')).toBeNull();
    expect(referrerHost('https://www.avocado.travel/', 'avocado.travel')).toBeNull();
    expect(referrerHost('', 'avocado.travel')).toBeNull();
    expect(referrerHost(undefined, 'avocado.travel')).toBeNull();
    expect(referrerHost('не адрес', 'avocado.travel')).toBeNull();
    expect(referrerHost('javascript:alert(1)', 'avocado.travel')).toBeNull();
  });

  it('поисковые системы узнаются по хосту', () => {
    expect(isSearchEngine('yandex.ru')).toBe(true);
    expect(isSearchEngine('ya.ru')).toBe(true);
    expect(isSearchEngine('google.com')).toBe(true);
    expect(isSearchEngine('google.co.uk')).toBe(true);
    expect(isSearchEngine('vk.com')).toBe(false);
    expect(isSearchEngine('notyandex.ru')).toBe(false);
  });
});

describe('посетители', () => {
  it('роботы и запросы без браузера не считаются', () => {
    expect(isBot('Mozilla/5.0 (compatible; YandexBot/3.0)')).toBe(true);
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('curl/8.0')).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/141.0 Safari/537.36')).toBe(
      false,
    );
  });

  it('хэш IP одинаков в течение дня и меняется на следующий день', () => {
    const today = visitorHash('198.51.100.7', '2026-10-22', 'salt-0123456789');
    expect(visitorHash('198.51.100.7', '2026-10-22', 'salt-0123456789')).toBe(today);
    expect(visitorHash('198.51.100.7', '2026-10-23', 'salt-0123456789')).not.toBe(today);
    expect(visitorHash('198.51.100.8', '2026-10-22', 'salt-0123456789')).not.toBe(today);
    expect(today).not.toContain('198.51.100.7');
  });
});

describe('период отчёта', () => {
  const today = '2026-10-22';

  it('по умолчанию — последние 30 дней', () => {
    expect(parsePeriod({}, today)).toEqual({ from: '2026-09-23', to: today });
    expect(parsePeriod({ from: 'вчера', to: 42 }, today)).toEqual({
      from: '2026-09-23',
      to: today,
    });
  });

  it('перепутанные даты меняются местами, будущее обрезается сегодняшним днём', () => {
    expect(parsePeriod({ from: '2026-10-10', to: '2026-10-01' }, today)).toEqual({
      from: '2026-10-01',
      to: '2026-10-10',
    });
    expect(parsePeriod({ from: '2026-10-20', to: '2026-12-31' }, today)).toEqual({
      from: '2026-10-20',
      to: today,
    });
  });

  it('период не длиннее года', () => {
    expect(parsePeriod({ from: '2020-01-01', to: today }, today).from).toBe('2025-10-22');
  });
});

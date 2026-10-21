import { describe, expect, it } from 'vitest';
import { clientIpFrom } from './request';

describe('IP посетителя', () => {
  it('берёт последний адрес — тот, что дописал прокси хостинга', () => {
    // Первый адрес подставил сам браузер, чтобы обойти бан, — ему верить нельзя.
    expect(clientIpFrom('1.2.3.4, 203.0.113.9', null)).toBe('203.0.113.9');
    expect(clientIpFrom('198.51.100.7', null)).toBe('198.51.100.7');
  });

  it('без X-Forwarded-For — X-Real-IP, без обоих — unknown', () => {
    expect(clientIpFrom(null, '198.51.100.8')).toBe('198.51.100.8');
    expect(clientIpFrom('', null)).toBe('unknown');
    expect(clientIpFrom(null, null)).toBe('unknown');
  });
});

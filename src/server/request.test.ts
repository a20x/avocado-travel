import { describe, expect, it, vi } from 'vitest';
import { clientIpFrom } from './request';

// Переменные окружения тесту не нужны: заголовок хостинга передаётся в clientIpFrom явно.
vi.mock('./env', () => ({ env: {} }));

const headersOf = (values: Record<string, string>) => new Headers(values);

describe('IP посетителя', () => {
  it('берёт последний адрес — тот, что дописал прокси хостинга', () => {
    // Первый адрес подставил сам браузер, чтобы обойти бан, — ему верить нельзя.
    expect(clientIpFrom(headersOf({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }))).toBe(
      '203.0.113.9',
    );
    expect(clientIpFrom(headersOf({ 'x-forwarded-for': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('без X-Forwarded-For — X-Real-IP, без обоих — unknown', () => {
    expect(clientIpFrom(headersOf({ 'x-real-ip': '198.51.100.8' }))).toBe('198.51.100.8');
    expect(clientIpFrom(headersOf({ 'x-forwarded-for': '' }))).toBe('unknown');
    expect(clientIpFrom(headersOf({}))).toBe('unknown');
  });

  it('с заголовком хостинга верит ему, а не X-Forwarded-For', () => {
    // Так приходят запросы на Render: подставленный браузером адрес, посетитель,
    // узел Cloudflare и внутренний прокси Render — последним стоит не посетитель.
    const render = headersOf({
      'x-forwarded-for': '9.9.9.9, 203.0.113.5, 104.23.168.94, 10.24.182.191',
      'true-client-ip': '203.0.113.5',
    });
    expect(clientIpFrom(render, 'true-client-ip')).toBe('203.0.113.5');
  });

  it('без заголовка хостинга в запросе — обычное правило', () => {
    const direct = headersOf({ 'x-forwarded-for': '198.51.100.7' });
    expect(clientIpFrom(direct, 'true-client-ip')).toBe('198.51.100.7');
  });
});

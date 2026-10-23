import { describe, expect, it } from 'vitest';
import { hashIp } from './visitor-hash';

describe('хэш IP посетителя', () => {
  const salt = 'salt-0123456789';

  it('с датой — одинаков в течение дня и меняется на следующий день', () => {
    const today = hashIp('198.51.100.7', salt, '2026-10-22');
    expect(hashIp('198.51.100.7', salt, '2026-10-22')).toBe(today);
    expect(hashIp('198.51.100.7', salt, '2026-10-23')).not.toBe(today);
    expect(hashIp('198.51.100.8', salt, '2026-10-22')).not.toBe(today);
  });

  it('без даты — постоянный; адрес по хэшу не виден', () => {
    const stable = hashIp('198.51.100.7', salt);
    expect(hashIp('198.51.100.7', salt)).toBe(stable);
    expect(stable).not.toBe(hashIp('198.51.100.7', salt, '2026-10-22'));
    expect(stable).not.toBe(hashIp('198.51.100.7', 'other-salt-0123'));
    expect(stable).not.toContain('198.51.100.7');
  });
});
